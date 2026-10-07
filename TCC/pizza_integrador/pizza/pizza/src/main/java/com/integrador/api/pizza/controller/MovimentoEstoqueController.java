package com.integrador.api.pizza.controller;

import com.integrador.api.pizza.dto.MovimentoEstoqueCadastroDTO;
import com.integrador.api.pizza.model.MovimentoEstoque;
import com.integrador.api.pizza.service.MovimentoEstoqueService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/movimentos-estoque")
public class MovimentoEstoqueController {

    @Autowired
    private MovimentoEstoqueService service;

    @PostMapping
    public ResponseEntity<MovimentoEstoque> cadastrar(@RequestBody @Valid MovimentoEstoqueCadastroDTO dados) {
        MovimentoEstoque movimentoSalvo = service.cadastrarMovimento(dados);
        return ResponseEntity.status(HttpStatus.CREATED).body(movimentoSalvo);
    }

    @GetMapping
    public ResponseEntity<List<MovimentoEstoque>> listarTodos() {
        List<MovimentoEstoque> movimentos = service.listarTodos();
        return ResponseEntity.ok(movimentos);
    }

    @GetMapping("/{id}")
    public ResponseEntity<MovimentoEstoque> buscarPorId(@PathVariable Long id) {
        Optional<MovimentoEstoque> movimento = service.buscarPorId(id);
        return movimento.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<MovimentoEstoque> atualizar(@PathVariable Long id, @RequestBody @Valid MovimentoEstoqueCadastroDTO dados) {
        return ResponseEntity.ok(service.atualizarMovimento(id, dados));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        service.deletarMovimento(id);
        return ResponseEntity.noContent().build();
    }
}
