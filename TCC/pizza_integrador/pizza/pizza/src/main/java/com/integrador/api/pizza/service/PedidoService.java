package com.integrador.api.pizza.service;

import com.integrador.api.pizza.dto.ItemPedidoDTO;
import com.integrador.api.pizza.dto.MovimentoEstoqueCadastroDTO;
import com.integrador.api.pizza.dto.PedidoCadastroDTO;
import com.integrador.api.pizza.enums.StatusMesa;
import com.integrador.api.pizza.model.*;
import com.integrador.api.pizza.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Locale;
import java.util.Comparator;
import java.math.BigDecimal;

@Service
public class PedidoService {

    @Autowired
    private PedidoRepository pedidoRepository;

    @Autowired
    private ClienteRepository clienteRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private ItemPedidoRepository itemPedidoRepository;

    @Autowired
    private ProdutoRepository produtoRepository;

    @Autowired
    private MovimentoEstoqueService movimentoEstoqueService;

    @Autowired
    private ComandaRepository comandaRepository;

    @Autowired
    private MesaRepository mesaRepository;

    @Transactional
    public Pedido cadastrarPedido(PedidoCadastroDTO dados) {
        dados.setTipo(validarTipo(dados.getTipo()));
        validarItens(dados.getItens());
        Pedido pedidoFinal;

        // 1. Lógica de Identificação: Mesa ou Balcão?
        if (dados.getMesaId() != null) {
            Mesa mesa = mesaRepository.buscarParaAtualizar(dados.getMesaId())
                    .orElseThrow(() -> new IllegalArgumentException("Mesa não encontrada com ID: " + dados.getMesaId()));

            if (!mesa.getAtivo()) {
                throw new IllegalArgumentException("A Mesa " + mesa.getNumero() + " está desativada no cadastro.");
            }

            // Tenta encontrar um pedido que já esteja "ABERTO" para essa mesa
            Optional<Pedido> pedidoExistente = pedidoRepository.findByMesaIdAndStatus(mesa.getId(), "ABERTO");

            if (pedidoExistente.isPresent()) {
                // Se já existe atendimento na mesa, usamos o pedido atual
                pedidoFinal = pedidoExistente.get();
            } else {
                // Se não existe pedido aberto, criamos um novo e ocupamos a mesa
                pedidoFinal = prepararNovoObjetoPedido(dados);
                pedidoFinal.setMesa(mesa);
                pedidoFinal = pedidoRepository.save(pedidoFinal);

                mesa.setStatus(StatusMesa.OCUPADA);
                mesaRepository.save(mesa);
            }
        } else {
            // Fluxo para pedidos sem mesa (Ex: Balcão ou Delivery)
            pedidoFinal = prepararNovoObjetoPedido(dados);
            pedidoFinal = pedidoRepository.save(pedidoFinal);
        }

        // 2. Salva os Itens e registra saída de estoque (para os itens enviados neste POST)
        processarItensESaidaEstoque(pedidoFinal, dados.getItens());

        return pedidoFinal;
    }

    /**
     * Método auxiliar para instanciar um novo Pedido com as associações básicas
     */
    private Pedido prepararNovoObjetoPedido(PedidoCadastroDTO dados) {
        Cliente cliente = clienteRepository.findById(dados.getClienteId())
                .orElseThrow(() -> new IllegalArgumentException("Cliente não encontrado com ID: " + dados.getClienteId()));

        Usuario usuario = usuarioRepository.findById(dados.getUsuarioId())
                .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado com ID: " + dados.getUsuarioId()));

        Comanda comanda = null;
        if (dados.getComandaId() != null) {
            comanda = comandaRepository.findById(dados.getComandaId())
                    .orElseThrow(() -> new IllegalArgumentException("Comanda não encontrada com ID: " + dados.getComandaId()));
        }

        return new Pedido(
                LocalDateTime.now(),
                dados.getTipo(),
                "ABERTO", // Status inicial permite adicionar mais itens depois
                cliente,
                usuario,
                comanda
        );
    }

    /**
     * Método auxiliar para salvar itens e baixar estoque
     */
    private void processarItensESaidaEstoque(Pedido pedido, List<ItemPedidoDTO> itens) {
        // Ordem estável de bloqueio para requisições contendo vários produtos.
        for (ItemPedidoDTO itemDto : itens.stream().sorted(Comparator.comparing(ItemPedidoDTO::getProdutoId)).toList()) {
            Produto produto = produtoRepository.buscarParaAtualizar(itemDto.getProdutoId())
                    .orElseThrow(() -> new IllegalArgumentException("Produto não encontrado com ID: " + itemDto.getProdutoId()));
            if (produto.getPreco() == null || !Double.isFinite(produto.getPreco()) || produto.getPreco() < 0) {
                throw new IllegalArgumentException("Preço inválido no cadastro do produto.");
            }

            ItemPedido itemPedido = new ItemPedido(
                    pedido,
                    produto,
                    itemDto.getQuantidade(),
                    BigDecimal.valueOf(produto.getPreco())
            );
            itemPedidoRepository.save(itemPedido);

            // Registro de Movimentação de Estoque
            MovimentoEstoqueCadastroDTO movimentoDto = new MovimentoEstoqueCadastroDTO();
            movimentoDto.setTipo("SAIDA");
            movimentoDto.setQuantidade(itemDto.getQuantidade().doubleValue());
            movimentoDto.setProdutoId(itemDto.getProdutoId());

            movimentoEstoqueService.registrarSaidaProduto(itemDto.getProdutoId(), itemDto.getQuantidade().doubleValue(), "PEDIDO", pedido.getId());
        }
    }

    // --- Outros Métodos ---

    public List<Pedido> listarTodos() {
        return pedidoRepository.findAll();
    }

    public Optional<Pedido> buscarPorId(Long id) {
        return pedidoRepository.findById(id);
    }

    @Transactional
    public Pedido atualizarPedido(Long id, PedidoCadastroDTO dados) {
        dados.setTipo(validarTipo(dados.getTipo()));
        return pedidoRepository.findById(id).map(pedidoExistente -> {
            pedidoExistente.setTipo(dados.getTipo());

            if (dados.getClienteId() != null) {
                Cliente cliente = clienteRepository.findById(dados.getClienteId())
                        .orElseThrow(() -> new IllegalArgumentException("Cliente não encontrado com ID: " + dados.getClienteId()));
                pedidoExistente.setCliente(cliente);
            }
            if (dados.getUsuarioId() != null) {
                Usuario usuario = usuarioRepository.findById(dados.getUsuarioId())
                        .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado com ID: " + dados.getUsuarioId()));
                pedidoExistente.setUsuario(usuario);
            }
            if (dados.getComandaId() != null) {
                Comanda comanda = comandaRepository.findById(dados.getComandaId())
                        .orElseThrow(() -> new IllegalArgumentException("Comanda não encontrada com ID: " + dados.getComandaId()));
                pedidoExistente.setComanda(comanda);
            } else {
                pedidoExistente.setComanda(null);
            }

            return pedidoRepository.save(pedidoExistente);
        }).orElseThrow(() -> new IllegalArgumentException("Pedido não encontrado com ID: " + id));
    }

    @Transactional
    public Pedido atualizarStatusPedido(Long id, String status) {
        String normalizado = status == null ? "" : status.trim().toUpperCase(Locale.ROOT);
        if (!List.of("ABERTO", "PENDENTE", "EM PREPARACAO", "PRONTO", "ENTREGUE", "CANCELADO", "FECHADO").contains(normalizado)) {
            throw new IllegalArgumentException("Situação de pedido inválida.");
        }
        return pedidoRepository.findById(id).map(pedidoExistente -> {
            pedidoExistente.setStatus(normalizado);
            return pedidoRepository.save(pedidoExistente);
        }).orElseThrow(() -> new IllegalArgumentException("Pedido não encontrado com ID: " + id));
    }

    public void deletarPedido(Long id) {
        pedidoRepository.deleteById(id);
    }

    private String validarTipo(String tipo) {
        String normalizado = tipo == null ? "" : tipo.trim().toUpperCase(Locale.ROOT);
        if (!List.of("PRESENCIAL", "DELIVERY", "RETIRADA", "ONLINE").contains(normalizado)) {
            throw new IllegalArgumentException("Tipo de pedido inválido.");
        }
        return normalizado;
    }

    private void validarItens(List<ItemPedidoDTO> itens) {
        if (itens == null || itens.isEmpty()) throw new IllegalArgumentException("Adicione pelo menos um item.");
        for (ItemPedidoDTO item : itens) {
            if (item == null || item.getProdutoId() == null || item.getProdutoId() <= 0
                    || item.getQuantidade() == null || item.getQuantidade() <= 0) {
                throw new IllegalArgumentException("Informe produto e quantidade positiva.");
            }
        }
    }
}
