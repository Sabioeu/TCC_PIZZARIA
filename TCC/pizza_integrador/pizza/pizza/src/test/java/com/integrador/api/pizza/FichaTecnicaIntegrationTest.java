package com.integrador.api.pizza;

import com.integrador.api.pizza.dto.*;
import com.integrador.api.pizza.enums.*;
import com.integrador.api.pizza.model.*;
import com.integrador.api.pizza.repository.*;
import com.integrador.api.pizza.service.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:fichas;MODE=PostgreSQL;DB_CLOSE_DELAY=-1","spring.datasource.username=sa","spring.datasource.password=","spring.datasource.driver-class-name=org.h2.Driver","spring.jpa.hibernate.ddl-auto=create-drop","spring.jpa.show-sql=false","PIZZA_ADMIN_EMAIL=","PIZZA_ADMIN_SENHA="})
class FichaTecnicaIntegrationTest {
    @Autowired ProdutoRepository produtos;
    @Autowired InsumoRepository insumos;
    @Autowired UsuarioRepository usuarios;
    @Autowired ClienteRepository clientes;
    @Autowired MesaRepository mesas;
    @Autowired ComandaRepository comandas;
    @Autowired ItemComandaRepository itens;
    @Autowired MovimentoEstoqueRepository movimentos;
    @Autowired TransacaoFinanceiraRepository transacoes;
    @Autowired FichaTecnicaService fichas;
    @Autowired DisponibilidadeEstoqueService disponibilidade;
    @Autowired MovimentoEstoqueService estoque;
    @Autowired InsumoService insumosService;
    @Autowired ItemComandaService itensService;
    @Autowired ComandaService comandaService;
    @Autowired PlatformTransactionManager tx;

    record Fixture(Long produto,Long outroProduto,Long insumo,Long cliente,Long usuario,Long mesa) {}
    Fixture fixture(double saldo) {
        return new TransactionTemplate(tx).execute(s -> {
            var p=new Produto("Pizza primeira","",30.0); p.setQuantidade(7.0); p=produtos.save(p);
            var q=new Produto("Pizza segunda","",40.0); q.setQuantidade(9.0); q=produtos.save(q);
            var i=insumos.save(new Insumo("Queijo "+UUID.randomUUID(),saldo,"kg"));
            var c=new Cliente(); c.setNome("Cliente teste"); c=clientes.save(c);
            var u=usuarios.save(new Usuario("Operador teste",UUID.randomUUID()+"@teste.com","hash-apenas-teste",PerfilUsuario.ADMINISTRADOR));
            var m=new Mesa(); m.setNumero(5000+(int)mesas.count()); m=mesas.save(m);
            return new Fixture(p.getId(),q.getId(),i.getId(),c.getId(),u.getId(),m.getId());
        });
    }
    FichaTecnicaDTO ficha(boolean ativa,Long insumo,String qtd) {
        var d=new FichaTecnicaDTO(); d.setPorIngredientes(ativa);
        var c=new FichaTecnicaDTO.Componente(); c.setInsumoId(insumo); c.setQuantidadePorUnidade(new BigDecimal(qtd));
        d.setComponentes(List.of(c)); return d;
    }
    void ativar(Fixture f,String qtd) {
        fichas.salvar(f.produto(),ficha(true,f.insumo(),qtd));
        fichas.salvar(f.outroProduto(),ficha(true,f.insumo(),qtd));
    }
    ItemComandaCadastroDTO item(Long id,int qtd) {
        var i=new ItemComandaCadastroDTO(); i.setProdutoId(id); i.setQuantidade(qtd); i.setPrecoUnitario(0.01); return i;
    }
    ComandaCadastroDTO pedido(Fixture f,int qtd) {
        var d=new ComandaCadastroDTO(); d.setUsuarioId(f.usuario()); d.setClienteId(f.cliente()); d.setMesaId(f.mesa().intValue()); d.setTipoAtendimento(TipoAtendimento.PRESENCIAL);
        d.setItens(List.of(item(f.produto(),qtd))); return d;
    }
    ComandaCadastroDTO retirada(Fixture f,Long produto,int qtd) {
        var d=pedido(f,qtd); d.setMesaId(null); d.setTipoAtendimento(TipoAtendimento.RETIRADA); d.setItens(List.of(item(produto,qtd))); return d;
    }
    MovimentoEstoqueCadastroDTO movimento(Long insumo,String tipo,double qtd) {
        var d=new MovimentoEstoqueCadastroDTO(); d.setInsumoId(insumo); d.setTipo(tipo); d.setQuantidade(qtd); return d;
    }
    DisponibilidadeEstoqueService.Disponibilidade livre(Long id) {
        return disponibilidade.listar().stream().filter(d -> d.produtoId().equals(id)).findFirst().orElseThrow();
    }

    @Test void ativarPreservaSaldoLegadoENaoInventaCustos() {
        var f=fixture(2); var resposta=fichas.salvar(f.produto(),ficha(true,f.insumo(),"0.25"));
        assertTrue(resposta.porIngredientes()); assertEquals("kg",resposta.componentes().getFirst().unidade());
        assertEquals(7.0,produtos.findById(f.produto()).orElseThrow().getQuantidade());
        assertEquals("INGREDIENTES",livre(f.produto()).modoEstoque()); assertEquals(8.0,livre(f.produto()).disponivel());
        var mov=new MovimentoEstoqueCadastroDTO(); mov.setProdutoId(f.produto()); mov.setTipo("ENTRADA"); mov.setQuantidade(1.0);
        assertThrows(RuntimeException.class,() -> estoque.cadastrarMovimento(mov));
    }
    @Test void carrinhoAgregaIngredientesEntreProdutosEDuplicatasSemReservarParcialmente() {
        var f=fixture(1); ativar(f,"0.5");
        var d=pedido(f,1); d.setItens(List.of(item(f.produto(),1),item(f.outroProduto(),1),item(f.produto(),1)));
        assertThrows(RuntimeException.class,() -> comandaService.abrirComanda(d));
        assertEquals(StatusMesa.DISPONIVEL,mesas.findById(f.mesa()).orElseThrow().getStatus());
        assertEquals(2.0,livre(f.produto()).disponivel()); assertEquals(1.0,insumos.findById(f.insumo()).orElseThrow().getQuantidade());
        assertEquals(0,livre(f.produto()).reservado());
    }
    @Test void reservaCompartilhadaBloqueiaOutroProdutoESaidaManualECancelamentoLibera() {
        var f=fixture(1); ativar(f,"0.5"); var c=comandaService.abrirComanda(pedido(f,2));
        assertEquals(0.0,livre(f.outroProduto()).disponivel());
        assertEquals(0,livre(f.outroProduto()).reservado());
        assertEquals(0,new BigDecimal("1.0").compareTo(livre(f.outroProduto()).ingredientes().getFirst().reservado()));
        assertThrows(RuntimeException.class,() -> comandaService.abrirComanda(retirada(f,f.outroProduto(),1)));
        assertThrows(RuntimeException.class,() -> estoque.cadastrarMovimento(movimento(f.insumo(),"SAIDA",0.1)));
        comandaService.deletarComanda(c.getId());
        assertEquals(2.0,livre(f.outroProduto()).disponivel());
        assertNotNull(comandaService.abrirComanda(retirada(f,f.outroProduto(),1)));
    }
    @Test void faturarUsaIngredientesUmaVezSemBaixarProduto() {
        var f=fixture(1); ativar(f,"0.1"); var c=comandaService.abrirComanda(pedido(f,3));
        assertEquals(90.0,c.getTotal());
        comandaService.fecharComanda(c.getId(),"PIX"); comandaService.fecharComanda(c.getId(),"PIX");
        assertEquals(0.7,insumos.findById(f.insumo()).orElseThrow().getQuantidade());
        assertEquals(7.0,produtos.findById(f.produto()).orElseThrow().getQuantidade());
        assertTrue(movimentos.findByProdutoId(f.produto()).isEmpty());
        var baixas=movimentos.findByInsumoId(f.insumo()); assertEquals(1,baixas.size());
        assertEquals("COMANDA",baixas.getFirst().getOrigem()); assertEquals(c.getId(),baixas.getFirst().getReferencia());
        assertEquals(0.3,baixas.getFirst().getQuantidade()); assertEquals(1,transacoes.findByComandaId(c.getId()).size());
    }
    @Test void falhaUltimoIngredienteReverteTudo() {
        var f=fixture(1); var segundo=insumos.save(new Insumo("Farinha "+UUID.randomUUID(),1.0,"kg"));
        var receita=ficha(true,f.insumo(),"0.25"); var outra=ficha(true,segundo.getId(),"0.5").getComponentes().getFirst();
        receita.setComponentes(List.of(receita.getComponentes().getFirst(),outra)); fichas.salvar(f.produto(),receita);
        var c=comandaService.abrirComanda(pedido(f,2));
        // Simula alteração externa ao sistema: última defesa deve reverter toda a transação.
        segundo.setQuantidade(0.0); insumos.save(segundo);
        assertThrows(RuntimeException.class,() -> comandaService.fecharComanda(c.getId(),"PIX"));
        assertEquals(1.0,insumos.findById(f.insumo()).orElseThrow().getQuantidade());
        assertTrue(movimentos.findByInsumoId(f.insumo()).isEmpty()); assertTrue(transacoes.findByComandaId(c.getId()).isEmpty());
        assertEquals("ABERTA",comandas.findById(c.getId()).orElseThrow().getStatus());
    }
    @Test void fichaNaoMudaComAtendimentoAbertoESnapshotHistoricoNaoMudaDepois() {
        var f=fixture(1); ativar(f,"0.25"); var c=comandaService.abrirComanda(pedido(f,2));
        assertThrows(RuntimeException.class,() -> fichas.salvar(f.produto(),ficha(true,f.insumo(),"0.1")));
        assertThrows(RuntimeException.class,() -> fichas.salvar(f.produto(),ficha(false,f.insumo(),"0.25")));
        comandaService.fecharComanda(c.getId(),"PIX"); fichas.salvar(f.produto(),ficha(true,f.insumo(),"0.1"));
        new TransactionTemplate(tx).executeWithoutResult(s -> {
            var snapshot=itens.findByComandaId(c.getId()).getFirst().getIngredientes().getFirst();
            assertEquals(0,new BigDecimal("0.25").compareTo(snapshot.getQuantidadePorUnidade()));
        });
        assertEquals(0.5,insumos.findById(f.insumo()).orElseThrow().getQuantidade());
    }
    @Test void legadosSemSnapshotContinuamPorProdutoEBloqueiamMudancaEnquantoAbertos() {
        var f=fixture(1); var c=comandaService.abrirComanda(pedido(f,2));
        new TransactionTemplate(tx).executeWithoutResult(s -> { var item=itens.findByComandaId(c.getId()).getFirst(); item.setPorIngredientes(null); itens.save(item); });
        assertThrows(RuntimeException.class,() -> fichas.salvar(f.produto(),ficha(true,f.insumo(),"0.25")));
        comandaService.fecharComanda(c.getId(),"PIX");
        assertEquals(5.0,produtos.findById(f.produto()).orElseThrow().getQuantidade()); assertEquals(1.0,insumos.findById(f.insumo()).orElseThrow().getQuantidade());
        assertEquals("PRODUTO",livre(f.produto()).modoEstoque());
    }
    @Test void edicaoDeItemReservaSnapshotELiberaAoReduzirRemover() {
        var f=fixture(1); ativar(f,"0.25"); var c=comandaService.abrirComanda(pedido(f,2));
        var id=itens.findByComandaId(c.getId()).getFirst().getId();
        assertThrows(RuntimeException.class,() -> itensService.atualizarItemComanda(c.getId(),id,item(f.produto(),5)));
        itensService.atualizarItemComanda(c.getId(),id,item(f.produto(),3)); assertEquals(1.0,livre(f.outroProduto()).disponivel());
        itensService.atualizarItemComanda(c.getId(),id,item(f.produto(),1)); assertEquals(3.0,livre(f.outroProduto()).disponivel());
        itensService.cadastrarItemComanda(c.getId(),item(f.outroProduto(),2)); assertEquals(1.0,livre(f.produto()).disponivel());
        itensService.deletarItemComanda(c.getId(),id); assertEquals(2.0,livre(f.produto()).disponivel());
    }
    @Test void ajustesDeInsumoEReversoesDeEntradaNaoConsomemReserva() {
        var f=fixture(0); ativar(f,"0.25"); var entrada=estoque.cadastrarMovimento(movimento(f.insumo(),"ENTRADA",1));
        comandaService.abrirComanda(pedido(f,3));
        assertThrows(RuntimeException.class,() -> estoque.deletarMovimento(entrada.getId()));
        assertThrows(RuntimeException.class,() -> estoque.atualizarMovimento(entrada.getId(),movimento(f.insumo(),"ENTRADA",0.5)));
        var dto=new InsumoCadastroDTO(); dto.setNome("Queijo ajustado"); dto.setUnidade("kg"); dto.setQuantidade(0.5);
        assertThrows(RuntimeException.class,() -> insumosService.atualizarInsumo(f.insumo(),dto));
        assertEquals(1.0,insumos.findById(f.insumo()).orElseThrow().getQuantidade());
        dto.setQuantidade(2.0); insumosService.atualizarInsumo(f.insumo(),dto);
        assertEquals(2.0,insumos.findById(f.insumo()).orElseThrow().getQuantidade()); assertEquals(2,movimentos.findByInsumoId(f.insumo()).size());
    }
    @Test void validaReceitaVaziaDuplicadaQuantidadeEUnidadeDaFicha() {
        var f=fixture(1); var d=ficha(true,f.insumo(),"0.25"); d.setComponentes(List.of());
        assertThrows(IllegalArgumentException.class,() -> fichas.salvar(f.produto(),d));
        var c=ficha(true,f.insumo(),"0.25").getComponentes().getFirst(); d.setComponentes(List.of(c,c));
        assertThrows(IllegalArgumentException.class,() -> fichas.salvar(f.produto(),d));
        for(var q:List.of("0","-1","0.0000001","1000000")) assertThrows(IllegalArgumentException.class,() -> fichas.salvar(f.produto(),ficha(true,f.insumo(),q)));
        assertFalse(fichas.buscar(f.produto()).porIngredientes());
        fichas.salvar(f.produto(),ficha(false,f.insumo(),"0.25")); assertEquals(1,fichas.buscar(f.produto()).componentes().size());
    }
    @Test void pedidosDiferentesSimultaneosNaoReservamMesmoIngrediente() throws Exception {
        var f=fixture(0.5); ativar(f,"0.5"); var inicio=new CountDownLatch(1); var executor=Executors.newFixedThreadPool(2);
        try {
            var a=executor.submit(() -> abrirConcorrente(inicio,retirada(f,f.produto(),1)));
            var b=executor.submit(() -> abrirConcorrente(inicio,retirada(f,f.outroProduto(),1)));
            inicio.countDown(); assertNotEquals(a.get(20,TimeUnit.SECONDS),b.get(20,TimeUnit.SECONDS));
            assertEquals(0.0,livre(f.produto()).disponivel()); assertEquals(0.5,insumos.findById(f.insumo()).orElseThrow().getQuantidade());
        } finally { executor.shutdownNow(); }
    }
    boolean abrirConcorrente(CountDownLatch inicio,ComandaCadastroDTO d) throws InterruptedException {
        inicio.await(); try { comandaService.abrirComanda(d); return true; } catch(org.springframework.web.server.ResponseStatusException ex) { return false; }
    }
    @Test void fechamentoSimultaneoNaoDuplicaConsumo() throws Exception {
        var f=fixture(1); ativar(f,"0.25"); var c=comandaService.abrirComanda(pedido(f,2));
        var executor=Executors.newFixedThreadPool(2); var inicio=new CountDownLatch(1);
        try {
            var a=executor.submit(() -> { inicio.await(); return comandaService.fecharComanda(c.getId(),"PIX"); });
            var b=executor.submit(() -> { inicio.await(); return comandaService.fecharComanda(c.getId(),"PIX"); });
            inicio.countDown(); a.get(20,TimeUnit.SECONDS); b.get(20,TimeUnit.SECONDS);
            assertEquals(0.5,insumos.findById(f.insumo()).orElseThrow().getQuantidade());
            assertEquals(1,movimentos.findByInsumoId(f.insumo()).size()); assertEquals(1,transacoes.findByComandaId(c.getId()).size());
        } finally { executor.shutdownNow(); }
    }
}
