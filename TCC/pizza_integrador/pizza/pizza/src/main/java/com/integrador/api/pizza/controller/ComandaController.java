package com.integrador.api.pizza.controller;

import com.integrador.api.pizza.dto.ComandaCadastroDTO;
import com.integrador.api.pizza.dto.FechamentoComandaDTO;
import com.integrador.api.pizza.model.Comanda;
import com.integrador.api.pizza.service.ComandaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/comandas")
public class ComandaController {

    @Autowired
    private ComandaService service;
    @Autowired private com.integrador.api.pizza.service.SessaoService sessao;

    @PostMapping
    public ResponseEntity<Comanda> abrir(@RequestBody @jakarta.validation.Valid ComandaCadastroDTO dados) {
        dados.setUsuarioId(sessao.usuarioAtual().getId());
        return ResponseEntity.ok(service.abrirComanda(dados));
    }

    @PutMapping("/{id}/adicionar-itens")
    public ResponseEntity<Comanda> adicionarItens(@PathVariable Long id, @RequestBody @jakarta.validation.Valid ComandaCadastroDTO dados) {
        return ResponseEntity.ok(service.adicionarItensAComanda(id, dados));
    }

    @GetMapping("/abertas")
    public ResponseEntity<List<Comanda>> buscarAbertas() {
        return ResponseEntity.ok(service.buscarComandasAbertas());
    }

    @GetMapping
    public ResponseEntity<List<Comanda>> listarTodas() {
        return ResponseEntity.ok(service.listarTodas());
    }

    // LINHA 49 CORRIGIDA
    @PatchMapping("/{id}/fechar")
    public ResponseEntity<Comanda> fechar(
            @PathVariable Long id,
            @RequestBody(required = false) FechamentoComandaDTO dados) {
        String tipoPagamento = dados == null ? null : dados.getTipoPagamento();
        return ResponseEntity.ok(service.fecharComanda(id, tipoPagamento));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        service.deletarComanda(id);
        return ResponseEntity.noContent().build();
    }
}
