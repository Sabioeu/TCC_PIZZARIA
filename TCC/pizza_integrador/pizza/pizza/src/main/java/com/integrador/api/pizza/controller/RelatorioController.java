package com.integrador.api.pizza.controller;

import com.integrador.api.pizza.service.RelatorioService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDate;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/relatorios")
public class RelatorioController {
    private final RelatorioService service;
    public RelatorioController(RelatorioService service) { this.service=service; }
    @GetMapping(value="/{nome}/dados", produces=MediaType.APPLICATION_JSON_VALUE)
    public RelatorioService.Resultado dados(@PathVariable String nome,
        @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate inicio,
        @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate fim,
        @RequestParam(defaultValue="") String busca, @RequestParam(defaultValue="") String status) {
        return service.consultar(nome,inicio,fim,busca,status);
    }
    @GetMapping("/{nome}")
    public ResponseEntity<byte[]> exportar(@PathVariable String nome,
        @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate inicio,
        @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate fim,
        @RequestParam(defaultValue="") String busca, @RequestParam(defaultValue="") String status,
        @RequestParam(defaultValue="pdf") String formato) throws net.sf.jasperreports.engine.JRException {
        if(!formato.equals("pdf") && !formato.equals("csv")) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Use PDF ou CSV.");
        var r=service.consultar(nome,inicio,fim,busca,status);
        byte[] bytes=formato.equals("pdf") ? service.pdf(r) : service.csv(r).getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(formato.equals("pdf") ? "application/pdf" : "text/csv;charset=UTF-8"))
            .header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=\""+nome+"."+formato+"\"")
            .header(HttpHeaders.CACHE_CONTROL,"no-store").body(bytes);
    }
}
