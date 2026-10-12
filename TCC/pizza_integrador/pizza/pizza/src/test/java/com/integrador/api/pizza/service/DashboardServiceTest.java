package com.integrador.api.pizza.service;

import com.integrador.api.pizza.repository.*;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class DashboardServiceTest {
    @Test void alertaUsaDisponibilidadeRealIncluindoPreparosEReservas() {
        var produtos=mock(ProdutoRepository.class);
        var disponibilidade=mock(DisponibilidadeEstoqueService.class);
        when(disponibilidade.listar()).thenReturn(List.of(
                new DisponibilidadeEstoqueService.Disponibilidade(1L,99,0,0,"INGREDIENTES",List.of(),List.of()),
                new DisponibilidadeEstoqueService.Disponibilidade(2L,50,48,2,"PRODUTO",List.of(),List.of()),
                new DisponibilidadeEstoqueService.Disponibilidade(3L,20,0,20,"PRODUTO",List.of(),List.of())));
        var service=new DashboardService(mock(TransacaoFinanceiraRepository.class),mock(ComandaRepository.class),
                mock(MesaRepository.class),produtos,mock(InsumoRepository.class),mock(ClienteRepository.class),
                mock(ContasApagarRepository.class),disponibilidade);
        assertEquals(2,service.obterResumo().itensEstoqueBaixo());
        verify(produtos,never()).findAll();
    }
}
