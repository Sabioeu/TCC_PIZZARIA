// src/main/java/com/integrador/api/pizza/controller/ClienteController.java
package com.integrador.api.pizza.controller;

import com.integrador.api.pizza.dto.ClienteCadastroDTO;
import com.integrador.api.pizza.model.Cliente;
import com.integrador.api.pizza.service.ClienteService;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid; // Certifique-se de que esta importação está correta
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/clientes")
public class ClienteController {

    @Autowired
    private ClienteService clienteService; // Pode mudar para injeção por construtor depois

    @PostMapping
    @Transactional // Importe org.springframework.transaction.annotation.Transactional
    public ResponseEntity<Cliente> cadastrar(@RequestBody @Valid ClienteCadastroDTO dados, UriComponentsBuilder uriBuilder) {
        Cliente cliente = clienteService.cadastrarCliente(dados); // <-- CHAMADA CORRETA AGORA
        URI uri = uriBuilder.path("/api/clientes/{id}").buildAndExpand(cliente.getId()).toUri();
        return ResponseEntity.created(uri).body(cliente);
    }

    // Se você tiver os outros métodos (listarTodos, buscarPorId, atualizar, deletar),
    // garanta que eles estão usando os nomes de método corretos do ClienteService
    // conforme a imagem: listarTodos(), buscarPorId(), atualizarCliente(), deletarCliente().

    @GetMapping
    public ResponseEntity<List<Cliente>> listarTodos() { // Importe java.util.List
        List<Cliente> clientes = clienteService.listarTodos();
        return ResponseEntity.ok(clientes);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Cliente> buscarPorId(@PathVariable Long id) {
        return clienteService.buscarPorId(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<Cliente> atualizar(@PathVariable Long id, @RequestBody @Valid ClienteCadastroDTO dados) {
        try {
            Cliente clienteAtualizado = clienteService.atualizarCliente(id, dados);
            return ResponseEntity.ok(clienteAtualizado);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        clienteService.deletarCliente(id);
        return ResponseEntity.noContent().build();
    }
}