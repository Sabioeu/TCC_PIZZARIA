package com.integrador.api.pizza.controller;

import com.integrador.api.pizza.dto.FichaTecnicaDTO;
import com.integrador.api.pizza.service.FichaTecnicaService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/produtos/{produtoId}/ficha-tecnica")
public class FichaTecnicaController {
    private final FichaTecnicaService service;
    public FichaTecnicaController(FichaTecnicaService service) { this.service=service; }
    @GetMapping public FichaTecnicaService.Ficha buscar(@PathVariable Long produtoId) { return service.buscar(produtoId); }
    @PutMapping public FichaTecnicaService.Ficha salvar(@PathVariable Long produtoId,@RequestBody @Valid FichaTecnicaDTO dto) { return service.salvar(produtoId,dto); }
}
