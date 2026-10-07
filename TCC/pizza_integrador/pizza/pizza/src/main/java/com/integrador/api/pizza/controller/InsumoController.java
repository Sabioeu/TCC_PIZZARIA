package com.integrador.api.pizza.controller;

import com.integrador.api.pizza.dto.InsumoCadastroDTO;
import com.integrador.api.pizza.model.Insumo;
import com.integrador.api.pizza.service.InsumoService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/insumos")
public class InsumoController {

    @Autowired
    private InsumoService service;

    @PostMapping
    public ResponseEntity<Insumo> cadastrar(@RequestBody @Valid InsumoCadastroDTO dados) {
        Insumo insumoSalvo = service.cadastrarInsumo(dados);
        return ResponseEntity.status(HttpStatus.CREATED).body(insumoSalvo);
    }

    @GetMapping
    public ResponseEntity<List<Insumo>> listarTodos() {
        List<Insumo> insumos = service.listarTodos();
        return ResponseEntity.ok(insumos);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Insumo> buscarPorId(@PathVariable Long id) {
        Optional<Insumo> insumo = service.buscarPorId(id);
        return insumo.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Insumo> atualizar(@PathVariable Long id, @RequestBody @Valid InsumoCadastroDTO dados) {
        try {
            Insumo insumoAtualizado = service.atualizarInsumo(id, dados);
            return ResponseEntity.ok(insumoAtualizado);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        service.deletarInsumo(id);
        return ResponseEntity.noContent().build();
    }
}