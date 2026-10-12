package com.integrador.api.pizza.service;

import com.integrador.api.pizza.dto.TransacaoFinanceiraCadastroDTO;
import com.integrador.api.pizza.model.Pedido;
import com.integrador.api.pizza.model.TransacaoFinanceira;

import com.integrador.api.pizza.repository.PedidoRepository;
import com.integrador.api.pizza.repository.TransacaoFinanceiraRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class TransacaoFinanceiraService {

    @Autowired
    private TransacaoFinanceiraRepository transacaoRepository;

    @Autowired
    private PedidoRepository pedidoRepository;

    @Transactional
    public TransacaoFinanceira cadastrarTransacao(TransacaoFinanceiraCadastroDTO dados) {
        validarCadastroManual(dados);
        Pedido pedido = null;
        if (dados.getPedidoId() != null) {
            pedido = pedidoRepository.findById(dados.getPedidoId())
                    .orElseThrow(() -> new IllegalArgumentException("Pedido não encontrado com ID: " + dados.getPedidoId()));
        }

        TransacaoFinanceira transacao = new TransacaoFinanceira();
        transacao.setDataHora(LocalDateTime.now());
        transacao.setTipo(dados.getTipo());
        transacao.setValor(dados.getValor());
        transacao.setDescricao(dados.getDescricao());
        transacao.setPedido(pedido);

        return transacaoRepository.save(transacao);
    }

    public List<TransacaoFinanceira> listarTodas() {
        return transacaoRepository.findAll();
    }

    public Optional<TransacaoFinanceira> buscarPorId(Long id) {
        return transacaoRepository.findById(id);
    }

    @Transactional
    public TransacaoFinanceira atualizarTransacao(Long id, TransacaoFinanceiraCadastroDTO dados) {
        validarCadastroManual(dados);
        return transacaoRepository.buscarParaAtualizar(id).map(transacaoExistente -> {
            protegerRecebimentoComanda(transacaoExistente);
            // A data/hora da transação não deve ser alterada após a criação, mas o resto pode
            transacaoExistente.setTipo(dados.getTipo());
            transacaoExistente.setValor(dados.getValor());
            transacaoExistente.setDescricao(dados.getDescricao());

            // O vínculo de comanda é exclusivo do faturamento e não é aceito neste CRUD manual.
            if (dados.getPedidoId() != null) {
                Pedido pedido = pedidoRepository.findById(dados.getPedidoId())
                        .orElseThrow(() -> new IllegalArgumentException("Pedido não encontrado com ID: " + dados.getPedidoId()));
                transacaoExistente.setPedido(pedido);
            } else {
                transacaoExistente.setPedido(null);
            }

            return transacaoRepository.save(transacaoExistente);
        }).orElseThrow(() -> new IllegalArgumentException("Transação Financeira não encontrada com ID: " + id));
    }

    @Transactional
    public void deletarTransacao(Long id) {
        TransacaoFinanceira transacao = transacaoRepository.buscarParaAtualizar(id)
                .orElseThrow(() -> new IllegalArgumentException("Transação não encontrada."));
        protegerRecebimentoComanda(transacao);
        transacaoRepository.delete(transacao);
    }

    private void protegerRecebimentoComanda(TransacaoFinanceira transacao) {
        if (transacao.getComanda() != null) {
            throw new IllegalArgumentException("Recebimentos do faturamento não podem ser alterados ou excluídos manualmente.");
        }
    }

    private void validarCadastroManual(TransacaoFinanceiraCadastroDTO dados) {
        if (dados.getComandaId() != null) {
            throw new IllegalArgumentException("Registre o recebimento de uma comanda pelo faturamento, evitando duplicidade.");
        }
        if (dados.getValor() == null || !Double.isFinite(dados.getValor()) || dados.getValor() <= 0) {
            throw new IllegalArgumentException("Informe um valor válido maior que zero.");
        }
    }
}
