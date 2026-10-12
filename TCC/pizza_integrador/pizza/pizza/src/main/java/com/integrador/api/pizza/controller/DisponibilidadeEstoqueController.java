package com.integrador.api.pizza.controller;
import com.integrador.api.pizza.service.DisponibilidadeEstoqueService;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController
@RequestMapping("/api/produtos/disponibilidade")
public class DisponibilidadeEstoqueController {
    private final DisponibilidadeEstoqueService service;
    public DisponibilidadeEstoqueController(DisponibilidadeEstoqueService service) { this.service=service; }
    @GetMapping public List<DisponibilidadeEstoqueService.Disponibilidade> listar() { return service.listar(); }
}
