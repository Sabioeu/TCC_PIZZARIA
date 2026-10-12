package com.integrador.api.pizza.controller;

import com.integrador.api.pizza.dto.PedidoCadastroDTO;
import com.integrador.api.pizza.model.Pedido;
import com.integrador.api.pizza.service.PedidoService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/pedidos")
public class PedidoController {

    @Autowired
    private PedidoService service;

    // Este recurso conserva o histórico anterior. Novos atendimentos passam
    // exclusivamente por ComandaService, responsável por reservas e faturamento.
    private ResponseStatusException fluxoLegado() {
        return new ResponseStatusException(HttpStatus.GONE,
                "O fluxo antigo de pedidos está disponível somente para consulta. Use /api/comandas para criar e gerenciar atendimentos.");
    }

    @PostMapping
    public ResponseEntity<Pedido> cadastrar(@RequestBody @Valid PedidoCadastroDTO dados) {
        throw fluxoLegado();
    }

    @GetMapping
    public ResponseEntity<List<Pedido>> listarTodos() {
        List<Pedido> pedidos = service.listarTodos();
        return ResponseEntity.ok(pedidos);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Pedido> buscarPorId(@PathVariable Long id) {
        Optional<Pedido> pedido = service.buscarPorId(id);
        return pedido.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Pedido> atualizar(@PathVariable Long id, @RequestBody @Valid PedidoCadastroDTO dados) {
        throw fluxoLegado();
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Pedido> atualizarStatus(@PathVariable Long id, @RequestParam String status) {
        throw fluxoLegado();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        throw fluxoLegado();
    }
}
