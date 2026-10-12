package com.integrador.api.pizza.controller;

import com.integrador.api.pizza.dto.TransacaoFinanceiraCadastroDTO;
import com.integrador.api.pizza.model.TransacaoFinanceira;
import com.integrador.api.pizza.service.TransacaoFinanceiraService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/transacoes")
public class TransacaoFinanceiraController {

    @Autowired
    private TransacaoFinanceiraService service;

    @PostMapping
    public ResponseEntity<TransacaoFinanceira> cadastrar(@RequestBody @Valid TransacaoFinanceiraCadastroDTO dados) {
        TransacaoFinanceira transacaoSalva = service.cadastrarTransacao(dados);
        return ResponseEntity.status(HttpStatus.CREATED).body(transacaoSalva);
    }

    @GetMapping
    public ResponseEntity<List<TransacaoFinanceira>> listarTodas() {
        List<TransacaoFinanceira> transacoes = service.listarTodas();
        return ResponseEntity.ok(transacoes);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TransacaoFinanceira> buscarPorId(@PathVariable Long id) {
        Optional<TransacaoFinanceira> transacao = service.buscarPorId(id);
        return transacao.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<TransacaoFinanceira> atualizar(@PathVariable Long id, @RequestBody @Valid TransacaoFinanceiraCadastroDTO dados) {
        TransacaoFinanceira transacaoAtualizada = service.atualizarTransacao(id, dados);
        return ResponseEntity.ok(transacaoAtualizada);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        service.deletarTransacao(id);
        return ResponseEntity.noContent().build();
    }
}
