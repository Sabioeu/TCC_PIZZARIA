package com.integrador.api.pizza.service;

import com.integrador.api.pizza.model.Comanda;
import com.integrador.api.pizza.model.TransacaoFinanceira;
import com.integrador.api.pizza.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.PlatformTransactionManager;
import java.time.*;
import java.util.Optional;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

class NumeracaoComandaServiceTest {
    @Test void proximoDiaComecaEmUmSemDependerDoGrandeNumeroLegado() {
        var repo=mock(ComandaRepository.class);
        var service=new NumeracaoComandaService(mock(ControleNumeracaoComandaRepository.class),repo,
                mock(PlatformTransactionManager.class),"America/Sao_Paulo");
        var hoje=LocalDate.of(2026,10,11);
        when(repo.maxNumeroDiario(hoje)).thenReturn(Optional.of(3));
        when(repo.maxNumeroDiario(hoje.plusDays(1))).thenReturn(Optional.empty());
        when(repo.findMaxNumeroComanda()).thenReturn(Optional.of(1760834260));
        assertEquals(4,service.proximaNoDia(hoje.atTime(23,59)).diario());
        var seguinte=service.proximaNoDia(hoje.plusDays(1).atStartOfDay());
        assertEquals(1,seguinte.diario()); assertEquals(1760834261,seguinte.legado());
    }
    @Test void referenciaMantemDiaDaAberturaEDescricaoOriginalNaoEhReescrita() {
        var c=new Comanda(); c.setNumero(1760834260); c.setNumeroDiario(3);
        c.setDataNumeracao(LocalDate.of(2026,10,11)); c.setDataHoraAbertura(LocalDateTime.of(2026,10,11,23,59));
        c.setDataHoraFechamento(LocalDateTime.of(2026,10,12,1,0));
        assertEquals("11/10/2026 · #003",c.getReferenciaExibicao());
        var t=new TransacaoFinanceira(); t.setComanda(c); t.setDescricao("Faturamento da comanda #1760834260");
        assertEquals("Faturamento da comanda 11/10/2026 · #003",t.getDescricaoExibicao());
        assertEquals("Faturamento da comanda #1760834260",t.getDescricao());
        t.setDescricao("Ajuste identificado pelo operador");
        assertEquals(t.getDescricao(),t.getDescricaoExibicao());
    }
}
