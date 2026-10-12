package com.integrador.api.pizza.exception;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;

class ValidationExceptionHandlerTest {
    private final ValidationExceptionHandler handler = new ValidationExceptionHandler();

    @Test void erroInesperadoNaoExpoeDetalhesInternos() {
        var resposta = handler.handleRuntimeException(new NullPointerException("segredo SQL /caminho/interno"));
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, resposta.getStatusCode());
        assertFalse(resposta.getBody().toString().contains("segredo"));
        assertFalse(resposta.getBody().toString().contains("SQL"));
    }

    @Test void violacaoBancoRetornaConflitoSemSql() {
        var resposta = handler.handleIntegrity(new DataIntegrityViolationException("INSERT INTO usuarios dados privados"));
        assertEquals(HttpStatus.CONFLICT, resposta.getStatusCode());
        assertFalse(resposta.getBody().toString().contains("INSERT"));
    }

    @Test void disputaDeAtualizacaoOrientaRecarregarSemDetalhesBanco() {
        var resposta = handler.handleConcurrency(new PessimisticLockingFailureException("tabela_privada"));
        assertEquals(HttpStatus.CONFLICT, resposta.getStatusCode());
        assertFalse(resposta.getBody().toString().contains("tabela_privada"));
    }

    @Test void payloadInvalidoNaoExpoeConteudoRecebido() {
        var resposta = handler.handleMalformedRequest(new IllegalArgumentException("conteudo privado"));
        assertEquals(HttpStatus.BAD_REQUEST, resposta.getStatusCode());
        assertFalse(resposta.getBody().toString().contains("privado"));
    }

    @Test void errosDeNegocioMantemMensagensClaras() {
        var resposta = handler.handleIllegalArgumentException(new IllegalArgumentException("Estoque insuficiente."));
        assertEquals(HttpStatus.BAD_REQUEST, resposta.getStatusCode());
        assertEquals("Estoque insuficiente.", resposta.getBody().get("message"));
        var naoEncontrado = handler.handleStatus(new ResponseStatusException(HttpStatus.NOT_FOUND, "Produto não encontrado."));
        assertEquals(HttpStatus.NOT_FOUND, naoEncontrado.getStatusCode());
    }
}
