package com.integrador.api.pizza.service;

import com.integrador.api.pizza.dto.ComandaCadastroDTO;
import com.integrador.api.pizza.enums.StatusMesa;
import com.integrador.api.pizza.enums.TipoAtendimento;
import com.integrador.api.pizza.enums.EtapaAtendimento;
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
    @Autowired private DisponibilidadeEstoqueService disponibilidade;
    @Autowired private NumeracaoComandaService numeracao;

    @Transactional
    public Comanda abrirComanda(ComandaCadastroDTO dados) {
        var tipo = dados.getTipoAtendimento() == null ? TipoAtendimento.PRESENCIAL : dados.getTipoAtendimento();
        var taxa = dados.getTaxaEntrega() == null ? java.math.BigDecimal.ZERO : dados.getTaxaEntrega();
        if (taxa.signum() < 0 || taxa.scale() > 2 || taxa.compareTo(new java.math.BigDecimal("999999.99")) > 0) throw new IllegalArgumentException("Taxa de entrega inválida.");
        if (dados.getTipoAtendimento() == TipoAtendimento.PRESENCIAL && dados.getMesaId() == null) throw new IllegalArgumentException("Selecione a mesa para atendimento presencial.");
        if (tipo == TipoAtendimento.DELIVERY && (dados.getEnderecoEntrega() == null || dados.getEnderecoEntrega().isBlank() || dados.getTelefoneContato() == null || dados.getTelefoneContato().isBlank())) throw new IllegalArgumentException("Delivery exige endereço e telefone de contato.");
        if (tipo != TipoAtendimento.DELIVERY && (taxa.signum() != 0 || (dados.getEnderecoEntrega() != null && !dados.getEnderecoEntrega().isBlank()))) throw new IllegalArgumentException("Endereço de entrega e taxa são exclusivos do delivery.");
        // Coordenação da abertura vem antes de mesa/produtos/insumos.
        var numero = numeracao.proxima();

        Usuario usuario = usuarioRepository.findById(dados.getUsuarioId())
                .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado"));

        Cliente cliente = clienteRepository.findById(dados.getClienteId())
                .orElseThrow(() -> new IllegalArgumentException("Cliente não encontrado"));

        Mesa mesaVinculada = null;
        if (dados.getMesaId() != null) {
            mesaVinculada = mesaRepository.buscarParaAtualizar(Long.valueOf(dados.getMesaId()))
                    .orElseThrow(() -> new IllegalArgumentException("Mesa não encontrada"));
            if (!Boolean.TRUE.equals(mesaVinculada.getAtivo()) || (tipo == TipoAtendimento.PRESENCIAL && mesaVinculada.getStatus() == StatusMesa.OCUPADA)) {
                throw new IllegalArgumentException("A mesa está ocupada ou desativada. Atualize a página e adicione os itens à comanda existente.");
            }
            if (tipo == TipoAtendimento.PRESENCIAL) {
                mesaVinculada.setStatus(StatusMesa.OCUPADA);
                mesaRepository.save(mesaVinculada);
            }
        }

        Comanda comanda = new Comanda();
        comanda.setNumero(numero.legado());
        comanda.setNumeroDiario(numero.diario());
        comanda.setDataNumeracao(numero.abertura().toLocalDate());
        comanda.setDataHoraAbertura(numero.abertura());
        comanda.setStatus("ABERTA");
        comanda.setUsuario(usuario);
        comanda.setCliente(cliente);
        comanda.setMesa(mesaVinculada);
        comanda.setTipoAtendimento(tipo);
        comanda.setEtapaAtendimento(EtapaAtendimento.RECEBIDO);
        comanda.setEnderecoEntrega(tipo == TipoAtendimento.DELIVERY ? dados.getEnderecoEntrega().trim() : null);
        comanda.setTelefoneContato(dados.getTelefoneContato() == null ? null : dados.getTelefoneContato().trim());
        comanda.setTaxaEntrega(taxa.setScale(2));
        comanda.setTotal(taxa.doubleValue());
        comanda.setItens(new ArrayList<>());

        processarNovosItens(comanda, dados);
        return comandaRepository.save(comanda);
    }

    @Transactional
    public Comanda adicionarItensAComanda(Long id, ComandaCadastroDTO dados) {
        Comanda comandaExistente = comandaRepository.buscarParaAtualizar(id)
                .orElseThrow(() -> new IllegalArgumentException("Comanda não encontrada"));

        if (!"ABERTA".equals(comandaExistente.getStatus())) {
            throw new IllegalArgumentException("Comanda fechada não aceita novos itens.");
        }
        if (comandaExistente.getTipoAtendimento() != TipoAtendimento.PRESENCIAL && comandaExistente.getEtapaAtendimento() != EtapaAtendimento.RECEBIDO) throw new IllegalArgumentException("Altere os itens antes de iniciar o preparo.");
        if (dados.getMesaId() != null && (comandaExistente.getMesa() == null || !comandaExistente.getMesa().getId().equals(dados.getMesaId().longValue()))) throw new IllegalArgumentException("A mesa não corresponde à comanda selecionada.");
        if (dados.getClienteId() != null && (comandaExistente.getCliente() == null || !comandaExistente.getCliente().getId().equals(dados.getClienteId()))) throw new IllegalArgumentException("O cliente não corresponde à comanda selecionada.");

        processarNovosItens(comandaExistente, dados);
        return comandaRepository.save(comandaExistente);
    }

    private void processarNovosItens(Comanda comanda, ComandaCadastroDTO dados) {
        if (dados.getItens() == null || dados.getItens().isEmpty()) throw new IllegalArgumentException("Adicione pelo menos um item.");
        var quantidades=new java.util.TreeMap<Long,Double>();
        for (var item : dados.getItens()) {
            if(item.getProdutoId()==null || item.getQuantidade()==null || item.getQuantidade()<=0) throw new IllegalArgumentException("Informe produto e quantidade positiva.");
            quantidades.merge(item.getProdutoId(),item.getQuantidade().doubleValue(),Double::sum);
        }
        var produtosValidados=disponibilidade.validarCarrinho(quantidades);

        double subtotalNovos = 0.0;
        for (var itemDto : dados.getItens()) {
            if (itemDto.getQuantidade() == null || itemDto.getQuantidade() <= 0) throw new IllegalArgumentException("A quantidade deve ser maior que zero.");
            Produto produto = produtosValidados.get(itemDto.getProdutoId());
            if (produto.getPreco() == null || !Double.isFinite(produto.getPreco()) || produto.getPreco() < 0) throw new IllegalArgumentException("Preço inválido no cadastro do produto.");
            ItemComanda item = new ItemComanda();
            item.setComanda(comanda);
            item.setProduto(produto);
            item.setQuantidade(itemDto.getQuantidade());
            item.setPrecoUnitario(produto.getPreco());
            item.setSubtotal(java.math.BigDecimal.valueOf(produto.getPreco()).multiply(java.math.BigDecimal.valueOf(itemDto.getQuantidade())).setScale(2, java.math.RoundingMode.HALF_UP).doubleValue());
            disponibilidade.capturarFicha(item);

            comanda.getItens().add(item);
            subtotalNovos += item.getSubtotal();
        }
        double totalAtual = (comanda.getTotal() != null) ? comanda.getTotal() : 0.0;
        comanda.setTotal(java.math.BigDecimal.valueOf(totalAtual).add(java.math.BigDecimal.valueOf(subtotalNovos)).setScale(2, java.math.RoundingMode.HALF_UP).doubleValue());
    }


    @Transactional
    public Comanda fecharComanda(Long id, String tipoPagamento) {
        Comanda comanda = comandaRepository.buscarParaAtualizar(id)
                .orElseThrow(() -> new IllegalArgumentException("Comanda não encontrada"));

        if ("FECHADA".equals(comanda.getStatus())) return comanda;
        if (!"ABERTA".equals(comanda.getStatus())) {
            throw new IllegalArgumentException("A comanda já foi fechada.");
        }
        if (comanda.getTipoAtendimento() != TipoAtendimento.PRESENCIAL && comanda.getEtapaAtendimento() != EtapaAtendimento.CONCLUIDO) throw new IllegalArgumentException("Conclua a entrega ou retirada antes de registrar o recebimento.");

        String pagamento = tipoPagamento == null ? "DINHEIRO" : tipoPagamento.toUpperCase(java.util.Locale.ROOT);
        if (!List.of("DINHEIRO", "PIX", "CREDITO", "DEBITO").contains(pagamento)) throw new IllegalArgumentException("Forma de pagamento inválida.");
        if (comanda.getItens() == null || comanda.getItens().isEmpty()) throw new IllegalArgumentException("Comanda sem itens não pode ser faturada.");
        // Mesa antes de produtos/insumos: mesma ordem da abertura, evitando inversão de locks.
        Mesa mesaFaturada=null;
        if(comanda.getMesa()!=null && comanda.getTipoAtendimento()==TipoAtendimento.PRESENCIAL) mesaFaturada=mesaRepository.buscarParaAtualizar(comanda.getMesa().getId()).orElseThrow();
        disponibilidade.bloquearItens(comanda.getItens());
        // Cada item usa o modo capturado: nunca baixa produto E ingrediente para a mesma venda.
        java.util.Map<Long, Double> quantidades = new java.util.TreeMap<>();
        for (ItemComanda item : comanda.getItens()) {
            if (item.getQuantidade() == null || item.getQuantidade() <= 0) throw new IllegalArgumentException("Item da comanda com quantidade inválida.");
            if(!Boolean.TRUE.equals(item.getPorIngredientes())) quantidades.merge(item.getProduto().getId(), item.getQuantidade().doubleValue(), Double::sum);
        }
        quantidades.forEach((produtoId, quantidade) -> movimentoEstoqueService.registrarSaidaProduto(produtoId, quantidade, "COMANDA", comanda.getId()));
        disponibilidade.consumoInsumos(comanda.getItens()).forEach((insumoId, quantidade) -> movimentoEstoqueService.registrarSaidaInsumo(insumoId, quantidade.doubleValue(), "COMANDA", comanda.getId()));

        if (mesaFaturada!=null) {
            mesaFaturada.setStatus(StatusMesa.DISPONIVEL);
            mesaRepository.save(mesaFaturada);
        }

        comanda.setStatus("FECHADA");
        comanda.setDataHoraFechamento(LocalDateTime.now());
        Comanda comandaFechada = comandaRepository.save(comanda);

        if (transacaoFinanceiraRepository.findByComandaId(id).isEmpty()) {
            TransacaoFinanceira transacao = new TransacaoFinanceira();
            transacao.setDataHora(LocalDateTime.now());
            transacao.setTipo(pagamento);
            transacao.setValor(comandaFechada.getTotal());
            transacao.setDescricao("Faturamento da comanda " + comandaFechada.getReferenciaExibicao());
            transacao.setComanda(comandaFechada);
            transacaoFinanceiraRepository.save(transacao);
        }

        return comandaFechada;
    }

    public List<Comanda> buscarComandasAbertas() { return comandaRepository.findByStatus("ABERTA"); }
    public List<Comanda> listarTodas() { return comandaRepository.findAll(); }
    public Optional<Comanda> buscarPorId(Long id) { return comandaRepository.findById(id); }
    @Transactional
    public Comanda atualizarEtapa(Long id, EtapaAtendimento proxima) {
        var comanda=comandaRepository.buscarParaAtualizar(id).orElseThrow(() -> new IllegalArgumentException("Atendimento não encontrado."));
        if (!"ABERTA".equals(comanda.getStatus()) || comanda.getTipoAtendimento() == TipoAtendimento.PRESENCIAL) throw new IllegalArgumentException("Este atendimento não permite mudar a etapa de entrega/retirada.");
        var atual=comanda.getEtapaAtendimento();
        if (proxima == atual) return comanda;
        var esperada = atual == EtapaAtendimento.RECEBIDO ? EtapaAtendimento.EM_PREPARO : atual == EtapaAtendimento.EM_PREPARO ? EtapaAtendimento.PRONTO : atual == EtapaAtendimento.PRONTO ? (comanda.getTipoAtendimento() == TipoAtendimento.DELIVERY ? EtapaAtendimento.EM_ENTREGA : EtapaAtendimento.CONCLUIDO) : atual == EtapaAtendimento.EM_ENTREGA ? EtapaAtendimento.CONCLUIDO : null;
        if (proxima == null || proxima != esperada) throw new IllegalArgumentException("Etapa inválida. Siga a sequência de preparo e atendimento.");
        comanda.setEtapaAtendimento(proxima);
        return comandaRepository.save(comanda);
    }
    @Transactional
    public void deletarComanda(Long id) {
        Comanda comanda = comandaRepository.buscarParaAtualizar(id).orElseThrow(() -> new IllegalArgumentException("Comanda não encontrada."));
        if ("CANCELADA".equals(comanda.getStatus())) return;
        if (!"ABERTA".equals(comanda.getStatus())) throw new IllegalArgumentException("Uma comanda fechada não pode ser excluída.");
        if (comanda.getMesa() != null && comanda.getTipoAtendimento() == TipoAtendimento.PRESENCIAL) {
            Mesa mesa = mesaRepository.buscarParaAtualizar(comanda.getMesa().getId()).orElseThrow();
            mesa.setStatus(StatusMesa.DISPONIVEL); mesaRepository.save(mesa);
        }
        disponibilidade.bloquearItens(comanda.getItens());
        comanda.setStatus("CANCELADA"); comanda.setDataHoraFechamento(LocalDateTime.now());
        comandaRepository.save(comanda);
    }
}
