package com.integrador.api.pizza.controller;

import com.integrador.api.pizza.model.Mesa;
import com.integrador.api.pizza.service.MesaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/mesas")
public class MesaController {

    @Autowired
    private MesaService service;

    @GetMapping
    public ResponseEntity<List<Mesa>> listarTodas() { // CORRIGIDO: Removido o espaço entre 'listar' e 'Todas'
        List<Mesa> mesas = service.listarTodas();
        return ResponseEntity.ok(mesas);
    }

    @PostMapping
    public ResponseEntity<Mesa> criar(@RequestBody Mesa mesa) {
        Mesa novaMesa = service.criar(mesa);
        return ResponseEntity.ok(novaMesa);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Mesa> atualizar(@PathVariable Long id, @RequestBody Mesa mesa) {
        Mesa mesaAtualizada = service.atualizar(id, mesa);
        return ResponseEntity.ok(mesaAtualizada);
    }
}
