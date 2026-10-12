package com.integrador.api.pizza.service;

import com.integrador.api.pizza.model.*;
import com.integrador.api.pizza.enums.StatusConta;
import com.integrador.api.pizza.repository.*;
import net.sf.jasperreports.engine.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.nio.file.*;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class RelatorioServiceTest {
    MovimentoEstoqueRepository movimentos=mock(MovimentoEstoqueRepository.class);
    ProdutoRepository produtos=mock(ProdutoRepository.class);
    InsumoRepository insumos=mock(InsumoRepository.class);
    TransacaoFinanceiraRepository transacoes=mock(TransacaoFinanceiraRepository.class);
    ContasApagarRepository contas=mock(ContasApagarRepository.class);
    RelatorioService service=new RelatorioService(movimentos,produtos,insumos,transacoes,contas);
    LocalDate dia=LocalDate.of(2026,10,6);
    @BeforeEach void preparar() {
        when(movimentos.findAll()).thenReturn(List.of()); when(produtos.findAll()).thenReturn(List.of());
        when(insumos.findAll()).thenReturn(List.of()); when(transacoes.findAll()).thenReturn(List.of()); when(contas.findAll()).thenReturn(List.of());
    }
    @Test void separaEntradasSaidasEIncluiDiaFinal() {
        Produto p=new Produto(); p.setNome("Pizza");
        when(movimentos.findAll()).thenReturn(List.of(new MovimentoEstoque(dia.atTime(23,59),"ENTRADA",10,p,null),new MovimentoEstoque(dia.atStartOfDay(),"SAIDA",2,p,null),new MovimentoEstoque(dia.plusDays(1).atStartOfDay(),"ENTRADA",20,p,null)));
        var entradas=service.consultar("estoque-entradas",dia,dia,"pizza","");
        assertEquals(1,entradas.linhas().size()); assertEquals("10",entradas.linhas().getFirst().celulas().get(4));
        assertEquals(1,service.consultar("estoque-saidas",dia,dia,"","").linhas().size());
    }
    @Test void naoSomaQuilosComUnidades() {
        Produto p=new Produto(); p.setNome("Pizza"); Insumo i=new Insumo(); i.setNome("Farinha"); i.setUnidade("kg");
        when(movimentos.findAll()).thenReturn(List.of(new MovimentoEstoque(dia.atStartOfDay(),"ENTRADA",10,p,null),new MovimentoEstoque(dia.atStartOfDay(),"ENTRADA",2,null,i)));
        assertEquals(3,service.consultar("estoque-entradas",null,null,"","").indicadores().size());
    }
    @Test void financeiroUsaPagamentoNaoVencimentoEDebitoNaoEhDespesa() {
        TransacaoFinanceira t=new TransacaoFinanceira(); t.setId(1L); t.setDataHora(dia.atTime(22,30)); t.setTipo("DEBITO"); t.setValor(100.0);
        ContaAPagar paga=conta(StatusConta.PAGA,"30.00",dia.minusMonths(1),dia);
        ContaAPagar pendente=conta(StatusConta.PENDENTE,"50.00",dia,null);
        ContaAPagar semData=conta(StatusConta.PAGA,"99.00",dia,null);
        when(transacoes.findAll()).thenReturn(List.of(t)); when(contas.findAll()).thenReturn(List.of(paga,pendente,semData));
        var r=service.consultar("financeiro",dia,dia,"","");
        assertEquals(2,r.linhas().size()); assertTrue(r.linhas().stream().anyMatch(l -> l.celulas().get(2).equals("Recebimento")));
        assertTrue(r.indicadores().get(3).valor().contains("70,00"));
        verify(contas,never()).save(any());
    }
    @Test void vencidaCalculadaSemMutacao() {
        ContaAPagar c=conta(StatusConta.PENDENTE,"25.00",LocalDate.now().minusDays(1),null);
        when(contas.findAll()).thenReturn(List.of(c));
        var r=service.consultar("contas-a-pagar",null,null,"","VENCIDA");
        assertEquals("VENCIDA",r.linhas().getFirst().celulas().get(3)); assertEquals(StatusConta.PENDENTE,c.getStatus());
        verify(contas,never()).save(any());
    }
    @Test void posicaoAtualNaoFiltraPorDataENaoInventaSaldoNulo() {
        Produto p=new Produto(); p.setId(1L); p.setNome("Pizza");
        when(produtos.findAll()).thenReturn(List.of(p));
        var r=service.consultar("estoque-posicao",dia.minusYears(1),dia.minusYears(1),"","");
        assertEquals("Não informado",r.linhas().getFirst().celulas().get(3));
    }
    @Test void validaFiltrosENomes() {
        assertThrows(ResponseStatusException.class,()->service.consultar("financeiro",dia,dia.minusDays(1),"",""));
        assertThrows(ResponseStatusException.class,()->service.consultar("contas-a-pagar",null,null,"","INVALIDO"));
        assertThrows(ResponseStatusException.class,()->service.consultar("../segredo",null,null,"",""));
    }
    @Test void posicaoNaoApresentaSaldoAntigoComoEstoqueDePizzaPreparada() {
        var p=new Produto("Pizza preparada","",30.0); p.setId(1L); p.setQuantidade(999.0); p.setPorIngredientes(true);
        when(produtos.findAll()).thenReturn(List.of(p));
        var r=service.consultar("estoque-posicao",null,null,"","");
        assertEquals("Preparado",r.linhas().getFirst().celulas().get(2));
        assertEquals("Pelos insumos",r.linhas().getFirst().celulas().get(3));
        assertTrue(r.observacao().contains("sem descontar reservas"));
    }
    @Test void relatorioDeSaidasIncluiConsumoAutomaticoDeIngrediente() {
        var i=new Insumo("Queijo",1.0,"kg");
        var m=new MovimentoEstoque(dia.atStartOfDay(),"SAIDA",0.000001,null,i);
        m.setOrigem("COMANDA"); m.setReferencia(42L);
        when(movimentos.findAll()).thenReturn(List.of(m));
        var r=service.consultar("estoque-saidas",dia,dia,"queijo","");
        assertEquals(1,r.linhas().size());
        assertEquals("Insumo",r.linhas().getFirst().celulas().get(2));
        assertEquals("SAIDA / COMANDA (ID 42)",r.linhas().getFirst().celulas().get(3));
        assertEquals("0,000001",r.linhas().getFirst().celulas().get(4));
        assertEquals("kg",r.linhas().getFirst().celulas().get(5));
    }
    @Test void saidasIdentificamComandaPorDataENumeroDiarioNaoPorNumeroLegado() {
        var repo=mock(ComandaRepository.class);
        var c=new Comanda(); c.setId(42L); c.setNumero(1760834260); c.setNumeroDiario(3); c.setDataNumeracao(dia);
        when(repo.findAll()).thenReturn(List.of(c));
        var p=new Produto("Bebida","",5.0); var m=new MovimentoEstoque(dia.atStartOfDay(),"SAIDA",1,p,null);
        m.setOrigem("COMANDA"); m.setReferencia(42L); when(movimentos.findAll()).thenReturn(List.of(m));
        var servico=new RelatorioService(movimentos,produtos,insumos,transacoes,contas,repo);
        var r=servico.consultar("estoque-saidas",null,null,"","");
        assertEquals("SAIDA / COMANDA 06/10/2026 · #003",r.linhas().getFirst().celulas().get(3));
        assertEquals(42L,m.getReferencia());
    }
    @Test void csvEscapaAspasEFormulas() {
        var r=new RelatorioService.Resultado("Teste","","",List.of("Item"),List.of(new RelatorioService.Linha(List.of("=SUM(1;2)")),new RelatorioService.Linha(List.of("Pizza \"especial\""))),List.of());
        String csv=service.csv(r); assertTrue(csv.startsWith("\uFEFF")); assertTrue(csv.contains("\"'=SUM(1;2)\"")); assertTrue(csv.contains("Pizza \"\"especial\"\""));
    }
    @Test void pdfVazioEComVariasPaginas() throws Exception {
        Path pasta=Path.of("target","relatorios-qa"); Files.createDirectories(pasta);
        for(String nome:List.of("estoque-entradas","estoque-saidas","estoque-posicao","financeiro","contas-a-pagar")) {
            byte[] bytes=service.pdf(service.consultar(nome,null,null,"",""));
            assertTrue(new String(bytes,0,4).startsWith("%PDF")); Files.write(pasta.resolve(nome+"-vazio.pdf"),bytes);
        }
        List<RelatorioService.Linha> linhas=new ArrayList<>();
        for(int i=0;i<65;i++) linhas.add(new RelatorioService.Linha(List.of("06/10/2026 23:59","Pizza de queijo com descrição detalhada para testar quebra de linha e acentuação "+i,"Recebimento","CARTÃO DE CRÉDITO","Comanda #123456","R$ 1.234,56")));
        var r=new RelatorioService.Resultado("Financeiro: recebimentos e despesas pagas","01/10/2026 até 31/10/2026","Saldo dos registros não é lucro nem extrato bancário. Contas pagas sem data não entram no saldo.",List.of("Data e hora","Descrição","Natureza","Pagamento","Referência","Valor"),linhas,List.of(new RelatorioService.Indicador("Registros","65"),new RelatorioService.Indicador("Recebimentos","R$ 80.246,40")));
        Files.write(pasta.resolve("financeiro-paginado.pdf"),service.pdf(r));
        try(var stream=getClass().getResourceAsStream("/relatorios/gerencial.jrxml")) { net.sf.jasperreports.engine.util.JRSaver.saveObject(JasperCompileManager.compileReport(stream),pasta.resolve("gerencial.jasper").toString()); }
    }
    private ContaAPagar conta(StatusConta status,String valor,LocalDate vencimento,LocalDate pagamento) {
        ContaAPagar c=new ContaAPagar(); c.setId(1L); c.setDescricao("Fornecedor"); c.setStatus(status); c.setValor(new BigDecimal(valor)); c.setDataVencimento(vencimento); c.setDataPagamento(pagamento); return c;
    }
}
