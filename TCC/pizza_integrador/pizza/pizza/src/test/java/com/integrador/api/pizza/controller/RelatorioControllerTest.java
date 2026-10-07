package com.integrador.api.pizza.controller;

import com.integrador.api.pizza.service.RelatorioService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.util.List;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class RelatorioControllerTest {
    RelatorioService service=mock(RelatorioService.class);
    MockMvc mvc;
    RelatorioService.Resultado resultado=new RelatorioService.Resultado("Teste","Período","Observação",List.of("Item"),List.of(),List.of());
    @BeforeEach void preparar() { mvc=MockMvcBuilders.standaloneSetup(new RelatorioController(service)).build(); }
    @Test void consultaJson() throws Exception {
        when(service.consultar("estoque-entradas",null,null,"","")).thenReturn(resultado);
        mvc.perform(get("/api/relatorios/estoque-entradas/dados")).andExpect(status().isOk()).andExpect(content().contentType("application/json")).andExpect(jsonPath("$.titulo").value("Teste")).andExpect(jsonPath("$.linhas").isEmpty());
    }
    @Test void exportaPdfECsvComCabecalhos() throws Exception {
        when(service.consultar("financeiro",null,null,"","")).thenReturn(resultado);
        when(service.pdf(resultado)).thenReturn("%PDF-test".getBytes()); when(service.csv(resultado)).thenReturn("Item\r\n");
        mvc.perform(get("/api/relatorios/financeiro")).andExpect(status().isOk()).andExpect(content().contentType("application/pdf")).andExpect(header().string("Content-Disposition","attachment; filename=\"financeiro.pdf\"")).andExpect(header().string("Cache-Control","no-store"));
        mvc.perform(get("/api/relatorios/financeiro").param("formato","csv")).andExpect(status().isOk()).andExpect(content().contentType("text/csv;charset=UTF-8")).andExpect(header().string("Content-Disposition","attachment; filename=\"financeiro.csv\""));
    }
    @Test void rejeitaFormatoEDataInvalidos() throws Exception {
        mvc.perform(get("/api/relatorios/financeiro").param("formato","exe")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/relatorios/financeiro/dados").param("inicio","ontem")).andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }
}
