package com.integrador.api.pizza.controller;

import com.integrador.api.pizza.exception.ValidationExceptionHandler;
import com.integrador.api.pizza.model.Pedido;
import com.integrador.api.pizza.service.PedidoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.util.List;
import java.util.Optional;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class PedidoControllerTest {
    final PedidoService service = mock(PedidoService.class);
    MockMvc mvc;
    final String dados = """
        {"clienteId":1,"usuarioId":1,"tipo":"RETIRADA",
         "itens":[{"produtoId":1,"quantidade":1,"precoUnitario":20.00}]}
        """;

    @BeforeEach void preparar() {
        var controller = new PedidoController();
        ReflectionTestUtils.setField(controller, "service", service);
        mvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new ValidationExceptionHandler()).build();
    }

    @Test void novasEscritasNaoPodemUsarFluxoDeBaixaLegado() throws Exception {
        for (var request : List.of(
                post("/api/pedidos").contentType("application/json").content(dados),
                put("/api/pedidos/1").contentType("application/json").content(dados),
                patch("/api/pedidos/1/status").param("status", "FECHADO"),
                delete("/api/pedidos/1"))) {
            mvc.perform(request.accept("application/json")).andExpect(status().isGone())
                    .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("/api/comandas")));
        }
        verifyNoInteractions(service);
    }

    @Test void conservaConsultasDoHistoricoSemMigrarNemRepetirEstoque() throws Exception {
        when(service.listarTodos()).thenReturn(List.of(new Pedido()));
        when(service.buscarPorId(1L)).thenReturn(Optional.of(new Pedido()));
        when(service.buscarPorId(2L)).thenReturn(Optional.empty());
        mvc.perform(get("/api/pedidos").accept("application/json")).andExpect(status().isOk()).andExpect(jsonPath("$", org.hamcrest.Matchers.hasSize(1)));
        mvc.perform(get("/api/pedidos/1").accept("application/json")).andExpect(status().isOk());
        mvc.perform(get("/api/pedidos/2").accept("application/json")).andExpect(status().isNotFound());
        verify(service).listarTodos();
        verify(service).buscarPorId(1L);
        verify(service).buscarPorId(2L);
        verifyNoMoreInteractions(service);
    }
}
