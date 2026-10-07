package com.integrador.api.pizza.controller;

import com.integrador.api.pizza.dto.ItemComandaCadastroDTO;
import com.integrador.api.pizza.model.ItemComanda;
import com.integrador.api.pizza.service.ItemComandaService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
// Rota base aninhada: /api/comandas/{comandaId}/itens
@RequestMapping("/api/comandas/{comandaId}/itens")
public class ItemComandaController {

    @Autowired
    private ItemComandaService service;

    // POST /api/comandas/{comandaId}/itens
    // 1. ADICIONAR NOVO ITEM A UMA COMANDA JÁ ABERTA
    @PostMapping
    public ResponseEntity<ItemComanda> cadastrar(@PathVariable Long comandaId, @RequestBody @Valid ItemComandaCadastroDTO dados) {
        // Chamada ao método do Service que adiciona o item e recalcula o total da Comanda
        ItemComanda itemSalvo = service.cadastrarItemComanda(comandaId, dados);
        return ResponseEntity.status(HttpStatus.CREATED).body(itemSalvo);
    }

    // GET /api/comandas/{comandaId}/itens
    // 2. LISTAR ITENS DE UMA COMANDA ESPECÍFICA
    @GetMapping
    public ResponseEntity<List<ItemComanda>> listarItensPorComanda(@PathVariable Long comandaId) {
        try {
            List<ItemComanda> itens = service.listarItensDaComanda(comandaId);
            return ResponseEntity.ok(itens);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // GET /api/comandas/{comandaId}/itens/{id}
    // 3. BUSCAR UM ITEM ESPECÍFICO PELO SEU ID
    @GetMapping("/{id}")
    public ResponseEntity<ItemComanda> buscarPorId(@PathVariable Long comandaId, @PathVariable Long id) {
        Optional<ItemComanda> item = service.buscarPorId(id).filter(i -> i.getComanda().getId().equals(comandaId));
        return item.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // PUT /api/comandas/{comandaId}/itens/{id}
    // 4. ATUALIZAR UM ITEM ESPECÍFICO (Ex: mudar a quantidade)
    @PutMapping("/{id}")
    public ResponseEntity<ItemComanda> atualizar(@PathVariable Long comandaId, @PathVariable Long id, @RequestBody @Valid ItemComandaCadastroDTO dados) {
        return ResponseEntity.ok(service.atualizarItemComanda(comandaId, id, dados));
    }

    // DELETE /api/comandas/{comandaId}/itens/{id}
    // 5. DELETAR UM ITEM ESPECÍFICO
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long comandaId, @PathVariable Long id) {
        service.deletarItemComanda(comandaId, id);
        return ResponseEntity.noContent().build();
    }
}
