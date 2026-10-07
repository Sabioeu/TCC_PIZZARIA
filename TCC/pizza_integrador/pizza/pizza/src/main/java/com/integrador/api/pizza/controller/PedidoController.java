package com.integrador.api.pizza.controller;

import com.integrador.api.pizza.dto.PedidoCadastroDTO;
import com.integrador.api.pizza.model.Pedido;
import com.integrador.api.pizza.service.PedidoService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/pedidos")
public class PedidoController {

    @Autowired
    private PedidoService service;
    @Autowired private com.integrador.api.pizza.service.SessaoService sessao;

    @PostMapping
    public ResponseEntity<Pedido> cadastrar(@RequestBody @Valid PedidoCadastroDTO dados) {
        dados.setUsuarioId(sessao.usuarioAtual().getId());
        Pedido pedidoSalvo = service.cadastrarPedido(dados);
        return ResponseEntity.status(HttpStatus.CREATED).body(pedidoSalvo);
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
        dados.setUsuarioId(sessao.usuarioAtual().getId());
        try {
            Pedido pedidoAtualizado = service.atualizarPedido(id, dados);
            return ResponseEntity.ok(pedidoAtualizado);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PatchMapping("/{id}/status") // Endpoint para atualizar apenas o status
    public ResponseEntity<Pedido> atualizarStatus(@PathVariable Long id, @RequestParam String status) {
        try {
            Pedido pedidoAtualizado = service.atualizarStatusPedido(id, status);
            return ResponseEntity.ok(pedidoAtualizado);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        service.deletarPedido(id);
        return ResponseEntity.noContent().build();
    }
}
