package com.integrador.api.pizza.service;

import com.integrador.api.pizza.dto.ComandaCadastroDTO;
import com.integrador.api.pizza.enums.StatusMesa;
import com.integrador.api.pizza.model.*;
import com.integrador.api.pizza.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class ComandaService {

    @Autowired private ComandaRepository comandaRepository;
    @Autowired private ProdutoRepository produtoRepository;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private ClienteRepository clienteRepository;
    @Autowired private MesaRepository mesaRepository;
    @Autowired private TransacaoFinanceiraRepository transacaoFinanceiraRepository;
    @Autowired private MovimentoEstoqueService movimentoEstoqueService;

    @Transactional
    public Comanda abrirComanda(ComandaCadastroDTO dados) {
        Integer maxNumero = comandaRepository.findMaxNumeroComanda().orElse(0);

        Usuario usuario = usuarioRepository.findById(dados.getUsuarioId())
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        Cliente cliente = clienteRepository.findById(dados.getClienteId())
                .orElseThrow(() -> new RuntimeException("Cliente não encontrado"));

        Mesa mesaVinculada = null;
        if (dados.getMesaId() != null) {
            mesaVinculada = mesaRepository.buscarParaAtualizar(Long.valueOf(dados.getMesaId()))
                    .orElseThrow(() -> new RuntimeException("Mesa não encontrada"));
            if (!Boolean.TRUE.equals(mesaVinculada.getAtivo()) || mesaVinculada.getStatus() == StatusMesa.OCUPADA) {
                throw new IllegalArgumentException("A mesa está ocupada ou desativada. Atualize a página e adicione os itens à comanda existente.");
            }
            mesaVinculada.setStatus(StatusMesa.OCUPADA);
            mesaRepository.save(mesaVinculada);
        }

        Comanda comanda = new Comanda();
        comanda.setNumero(maxNumero + 1);
        comanda.setDataHoraAbertura(LocalDateTime.now());
        comanda.setStatus("ABERTA");
        comanda.setUsuario(usuario);
        comanda.setCliente(cliente);
        comanda.setMesa(mesaVinculada);
        comanda.setTotal(0.0);
        comanda.setItens(new ArrayList<>());

        processarNovosItens(comanda, dados);
        return comandaRepository.save(comanda);
    }

    @Transactional
    public Comanda adicionarItensAComanda(Long id, ComandaCadastroDTO dados) {
        Comanda comandaExistente = comandaRepository.buscarParaAtualizar(id)
                .orElseThrow(() -> new RuntimeException("Comanda não encontrada"));

        if (!"ABERTA".equals(comandaExistente.getStatus())) {
            throw new RuntimeException("Comanda fechada não aceita novos itens.");
        }

        processarNovosItens(comandaExistente, dados);
        return comandaRepository.save(comandaExistente);
    }

    private void processarNovosItens(Comanda comanda, ComandaCadastroDTO dados) {
        if (dados.getItens() == null || dados.getItens().isEmpty()) throw new IllegalArgumentException("Adicione pelo menos um item.");

        double subtotalNovos = 0.0;
        for (var itemDto : dados.getItens()) {
            if (itemDto.getQuantidade() == null || itemDto.getQuantidade() <= 0) throw new IllegalArgumentException("A quantidade deve ser maior que zero.");
            Produto produto = produtoRepository.findById(itemDto.getProdutoId()).orElseThrow();
            if (produto.getPreco() == null || !Double.isFinite(produto.getPreco()) || produto.getPreco() < 0) throw new IllegalArgumentException("Preço inválido no cadastro do produto.");
            ItemComanda item = new ItemComanda();
            item.setComanda(comanda);
            item.setProduto(produto);
            item.setQuantidade(itemDto.getQuantidade());
            item.setPrecoUnitario(produto.getPreco());
            item.setSubtotal(java.math.BigDecimal.valueOf(produto.getPreco()).multiply(java.math.BigDecimal.valueOf(itemDto.getQuantidade())).setScale(2, java.math.RoundingMode.HALF_UP).doubleValue());

            comanda.getItens().add(item);
            subtotalNovos += item.getSubtotal();
        }
        double totalAtual = (comanda.getTotal() != null) ? comanda.getTotal() : 0.0;
        comanda.setTotal(java.math.BigDecimal.valueOf(totalAtual).add(java.math.BigDecimal.valueOf(subtotalNovos)).setScale(2, java.math.RoundingMode.HALF_UP).doubleValue());
    }


    @Transactional
    public Comanda fecharComanda(Long id, String tipoPagamento) {
        Comanda comanda = comandaRepository.buscarParaAtualizar(id)
                .orElseThrow(() -> new RuntimeException("Comanda não encontrada"));

        if ("FECHADA".equals(comanda.getStatus())) return comanda;
        if (!"ABERTA".equals(comanda.getStatus())) {
            throw new RuntimeException("A comanda já foi fechada.");
        }

        String pagamento = tipoPagamento == null ? "DINHEIRO" : tipoPagamento.toUpperCase(java.util.Locale.ROOT);
        if (!List.of("DINHEIRO", "PIX", "CREDITO", "DEBITO").contains(pagamento)) throw new IllegalArgumentException("Forma de pagamento inválida.");
        if (comanda.getItens() == null || comanda.getItens().isEmpty()) throw new IllegalArgumentException("Comanda sem itens não pode ser faturada.");
        // Bloqueia a comanda e os produtos; ordem estável evita baixas duplicadas e disputas de saldo.
        java.util.Map<Long, Double> quantidades = new java.util.TreeMap<>();
        for (ItemComanda item : comanda.getItens()) {
            if (item.getQuantidade() == null || item.getQuantidade() <= 0) throw new IllegalArgumentException("Item da comanda com quantidade inválida.");
            quantidades.merge(item.getProduto().getId(), item.getQuantidade().doubleValue(), Double::sum);
        }
        quantidades.forEach((produtoId, quantidade) -> movimentoEstoqueService.registrarSaidaProduto(produtoId, quantidade, "COMANDA", comanda.getId()));

        if (comanda.getMesa() != null) {
            Mesa mesa = mesaRepository.buscarParaAtualizar(comanda.getMesa().getId()).orElseThrow();
            mesa.setStatus(StatusMesa.DISPONIVEL);
            mesaRepository.save(mesa);
        }

        comanda.setStatus("FECHADA");
        comanda.setDataHoraFechamento(LocalDateTime.now());
        Comanda comandaFechada = comandaRepository.save(comanda);

        if (transacaoFinanceiraRepository.findByComandaId(id).isEmpty()) {
            TransacaoFinanceira transacao = new TransacaoFinanceira();
            transacao.setDataHora(LocalDateTime.now());
            transacao.setTipo(pagamento);
            transacao.setValor(comandaFechada.getTotal());
            transacao.setDescricao("Faturamento da comanda #" + comandaFechada.getNumero());
            transacao.setComanda(comandaFechada);
            transacaoFinanceiraRepository.save(transacao);
        }

        return comandaFechada;
    }

    public List<Comanda> buscarComandasAbertas() { return comandaRepository.findByStatus("ABERTA"); }
    public List<Comanda> listarTodas() { return comandaRepository.findAll(); }
    public Optional<Comanda> buscarPorId(Long id) { return comandaRepository.findById(id); }
    @Transactional
    public void deletarComanda(Long id) {
        Comanda comanda = comandaRepository.buscarParaAtualizar(id).orElseThrow(() -> new IllegalArgumentException("Comanda não encontrada."));
        if ("CANCELADA".equals(comanda.getStatus())) return;
        if (!"ABERTA".equals(comanda.getStatus())) throw new IllegalArgumentException("Uma comanda fechada não pode ser excluída.");
        if (comanda.getMesa() != null) {
            Mesa mesa = mesaRepository.buscarParaAtualizar(comanda.getMesa().getId()).orElseThrow();
            mesa.setStatus(StatusMesa.DISPONIVEL); mesaRepository.save(mesa);
        }
        comanda.setStatus("CANCELADA"); comanda.setDataHoraFechamento(LocalDateTime.now());
        comandaRepository.save(comanda);
    }
}
