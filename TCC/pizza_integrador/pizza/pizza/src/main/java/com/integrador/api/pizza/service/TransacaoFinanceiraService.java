package com.integrador.api.pizza.service;

import com.integrador.api.pizza.dto.TransacaoFinanceiraCadastroDTO;
import com.integrador.api.pizza.model.Comanda;
import com.integrador.api.pizza.model.Pedido;
import com.integrador.api.pizza.model.TransacaoFinanceira;

import com.integrador.api.pizza.repository.ComandaRepository;
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

    // Repositório Comanda injetado com o nome 'cmdRepository'
    @Autowired
    private ComandaRepository cmdRepository;

    @Autowired
    private PedidoRepository pedidoRepository;

    @Transactional
    public TransacaoFinanceira cadastrarTransacao(TransacaoFinanceiraCadastroDTO dados) {
        Comanda comanda = null;
        if (dados.getComandaId() != null) {
            // 🚨 CORRIGIDO: Usando 'cmdRepository'
            comanda = cmdRepository.findById(dados.getComandaId())
                    .orElseThrow(() -> new RuntimeException("Comanda não encontrada com ID: " + dados.getComandaId()));
        }

        Pedido pedido = null;
        if (dados.getPedidoId() != null) {
            pedido = pedidoRepository.findById(dados.getPedidoId())
                    .orElseThrow(() -> new RuntimeException("Pedido não encontrado com ID: " + dados.getPedidoId()));
        }

        // 🚨 CORREÇÃO DE COMPILAÇÃO: Usando construtor vazio e setters
        TransacaoFinanceira transacao = new TransacaoFinanceira();
        transacao.setDataHora(LocalDateTime.now());
        transacao.setTipo(dados.getTipo());
        transacao.setValor(dados.getValor());
        transacao.setDescricao(dados.getDescricao());
        transacao.setComanda(comanda);
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
        return transacaoRepository.findById(id).map(transacaoExistente -> {
            // A data/hora da transação não deve ser alterada após a criação, mas o resto pode
            transacaoExistente.setTipo(dados.getTipo());
            transacaoExistente.setValor(dados.getValor());
            transacaoExistente.setDescricao(dados.getDescricao());

            // Lógica para atualizar associações (Comanda/Pedido)
            if (dados.getComandaId() != null) {
                // 🚨 CORRIGIDO: Usando 'cmdRepository'
                Comanda comanda = cmdRepository.findById(dados.getComandaId())
                        .orElseThrow(() -> new RuntimeException("Comanda não encontrada com ID: " + dados.getComandaId()));
                transacaoExistente.setComanda(comanda);
            } else {
                transacaoExistente.setComanda(null);
            }
            if (dados.getPedidoId() != null) {
                Pedido pedido = pedidoRepository.findById(dados.getPedidoId())
                        .orElseThrow(() -> new RuntimeException("Pedido não encontrado com ID: " + dados.getPedidoId()));
                transacaoExistente.setPedido(pedido);
            } else {
                transacaoExistente.setPedido(null);
            }

            return transacaoRepository.save(transacaoExistente);
        }).orElseThrow(() -> new RuntimeException("Transação Financeira não encontrada com ID: " + id));
    }

    public void deletarTransacao(Long id) {
        transacaoRepository.deleteById(id);
    }
}