package com.integrador.api.pizza.controller;
import com.integrador.api.pizza.dto.ContaInputDTO;
import com.integrador.api.pizza.dto.ContaAtualizacaoDTO;
import com.integrador.api.pizza.model.ContaAPagar;
import com.integrador.api.pizza.service.ContaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;


@RestController
@RequestMapping("/api/contas")
public class ContasApagarController {

    @Autowired
    private ContaService service;

    @GetMapping
    public List<ContaAPagar> filtrar(
            @RequestParam(required = false) Long fornecedorId,
            @RequestParam(required = false) String mes) {
        return service.buscarComFiltros(fornecedorId, mes);
    }

    @PostMapping
    public ResponseEntity<List<ContaAPagar>> salvar(@RequestBody ContaInputDTO dto) {
        return ResponseEntity.ok(service.criarContas(dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        service.excluir(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<ContaAPagar> atualizar(@PathVariable Long id, @RequestBody ContaAtualizacaoDTO dto) {
        return ResponseEntity.ok(service.atualizar(id, dto));
    }

    @PatchMapping("/{id}/pagar")
    public ResponseEntity<ContaAPagar> pagar(@PathVariable Long id) {
        return ResponseEntity.ok(service.pagar(id));
    }
}
