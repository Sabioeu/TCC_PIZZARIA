package com.integrador.api.pizza.controller;

import com.integrador.api.pizza.model.Fornecedor;
import com.integrador.api.pizza.service.FornecedorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/fornecedores")
public class FornecedorController {

    @Autowired
    private FornecedorService service;

    @GetMapping
    public List<Fornecedor> listar(@RequestParam(value = "apenasAtivos", required = false, defaultValue = "false") String apenasAtivos) {
        // Recebemos como String para evitar erro de conversão 400 e convertemos manualmente
        if ("true".equalsIgnoreCase(apenasAtivos)) {
            return service.listarAtivos();
        }
        return service.listarTodos();
    }

    @PutMapping("/{id}")
    public ResponseEntity<Fornecedor> atualizar(@PathVariable Long id, @RequestBody Fornecedor dados) {
        return ResponseEntity.ok(service.atualizar(id, dados));
    }

    @PostMapping
    public ResponseEntity<Fornecedor> cadastrar(@RequestBody Fornecedor fornecedor) {
        return ResponseEntity.ok(service.salvar(fornecedor));
    }
}
