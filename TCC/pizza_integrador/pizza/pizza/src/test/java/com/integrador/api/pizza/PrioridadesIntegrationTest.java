package com.integrador.api.pizza;

import com.integrador.api.pizza.dto.*;
import com.integrador.api.pizza.enums.*;
import com.integrador.api.pizza.model.*;
import com.integrador.api.pizza.repository.*;
import com.integrador.api.pizza.service.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import java.math.BigDecimal;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:prioridades;MODE=PostgreSQL;DB_CLOSE_DELAY=-1","spring.datasource.username=sa","spring.datasource.password=","spring.datasource.driver-class-name=org.h2.Driver","spring.jpa.hibernate.ddl-auto=create-drop","spring.jpa.show-sql=false","PIZZA_ADMIN_EMAIL=","PIZZA_ADMIN_SENHA="})
@AutoConfigureMockMvc
class PrioridadesIntegrationTest {
    @Test void cadastroPublicoValidaSenhasEPerfil() throws Exception {
        String email=UUID.randomUUID()+"@teste.com";
        String corpo=json.writeValueAsString(Map.of("email",email,"senha","SenhaTeste123!","confirmarSenha","SenhaTeste123!","perfil","ADMINISTRADOR"));
        mvc.perform(post("/api/auth/registro").with(csrf()).contentType("application/json").content(corpo))
            .andExpect(status().isCreated()).andExpect(jsonPath("perfil").value("ATENDENTE")).andExpect(jsonPath("senha").doesNotExist());
        assertTrue(encoder.matches("SenhaTeste123!",usuarios.findByEmailIgnoreCase(email).orElseThrow().getSenha()));
        mvc.perform(post("/api/auth/registro").with(csrf()).contentType("application/json").content(corpo)).andExpect(status().isBadRequest());
        String invalido=json.writeValueAsString(Map.of("email",UUID.randomUUID()+"@teste.com","senha","SenhaTeste123!","confirmarSenha","outraSenha"));
        mvc.perform(post("/api/auth/registro").with(csrf()).contentType("application/json").content(invalido)).andExpect(status().isBadRequest());
        mvc.perform(post("/api/auth/registro").contentType("application/json").content(corpo)).andExpect(status().isForbidden());
    }
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired PasswordEncoder encoder;
    @Autowired UsuarioRepository usuarios;
    @Autowired ClienteRepository clientes;
    @Autowired ProdutoRepository produtos;
    @Autowired InsumoRepository insumos;
    @Autowired ComandaRepository comandas;
    @Autowired MesaRepository mesas;
    @Autowired MovimentoEstoqueRepository movimentos;
    @Autowired TransacaoFinanceiraRepository transacoes;
    @Autowired ComandaService service;
    @Autowired ItemComandaService itensService;
    @Autowired ItemComandaRepository itens;
    @Autowired MovimentoEstoqueService estoque;
    @Autowired PlatformTransactionManager tx;
    record Fixture(Long produto,Long cliente,Long usuario,Long mesa) {}
    Fixture fixture(double saldo) {
        return new TransactionTemplate(tx).execute(s -> {
            Produto p=new Produto(); p.setNome("Pizza teste"); p.setPreco(20.0); p.setQuantidade(saldo); p=produtos.save(p);
            Cliente c=new Cliente(); c.setNome("Cliente teste"); c=clientes.save(c);
            Usuario u=usuarios.save(new Usuario("Admin teste",UUID.randomUUID()+"@teste.com",encoder.encode("SenhaDeTeste123!"),PerfilUsuario.ADMINISTRADOR));
            Mesa m=new Mesa(); m.setNumero(1000+(int)mesas.count()); m=mesas.save(m);
            return new Fixture(p.getId(),c.getId(),u.getId(),m.getId());
        });
    }
    ComandaCadastroDTO dados(Fixture f,int qtd) {
        var dto=new ComandaCadastroDTO(); dto.setUsuarioId(f.usuario()); dto.setClienteId(f.cliente()); dto.setMesaId(f.mesa().intValue());
        var item=new ItemComandaCadastroDTO(); item.setProdutoId(f.produto()); item.setQuantidade(qtd); item.setPrecoUnitario(0.01); dto.setItens(List.of(item)); return dto;
    }
    @Test void faturamentoBaixaEstoqueERecebimentoUmaVez() {
        Fixture f=fixture(10); var comanda=service.abrirComanda(dados(f,3));
        assertEquals(60.0,comanda.getTotal()); // Preço vem do cadastro, não do navegador.
        assertEquals(10.0,produtos.findById(f.produto()).orElseThrow().getQuantidade());
        service.fecharComanda(comanda.getId(),"PIX"); service.fecharComanda(comanda.getId(),"PIX");
        assertEquals(7.0,produtos.findById(f.produto()).orElseThrow().getQuantidade());
        assertEquals(1,transacoes.findByComandaId(comanda.getId()).size());
        assertEquals(1,movimentos.findByProdutoId(f.produto()).size());
        assertEquals("COMANDA",movimentos.findByProdutoId(f.produto()).getFirst().getOrigem());
        assertEquals(StatusMesa.DISPONIVEL,mesas.findById(f.mesa()).orElseThrow().getStatus());
        assertThrows(RuntimeException.class,()->service.adicionarItensAComanda(comanda.getId(),dados(f,1)));
        assertThrows(RuntimeException.class,()->service.deletarComanda(comanda.getId()));
    }
    @Test void faltaDeEstoqueReverteTodoFaturamento() {
        Fixture f=fixture(1); var comanda=service.abrirComanda(dados(f,2));
        assertThrows(RuntimeException.class,()->service.fecharComanda(comanda.getId(),"PIX"));
        assertEquals("ABERTA",comandas.findById(comanda.getId()).orElseThrow().getStatus());
        assertEquals(1.0,produtos.findById(f.produto()).orElseThrow().getQuantidade());
        assertTrue(transacoes.findByComandaId(comanda.getId()).isEmpty());
        assertTrue(movimentos.findByProdutoId(f.produto()).isEmpty());
        assertEquals(StatusMesa.OCUPADA,mesas.findById(f.mesa()).orElseThrow().getStatus());
    }
    @Test void falhaNoSegundoProdutoTambemRevertePrimeiraBaixa() {
        Fixture f=fixture(10); Fixture g=fixture(0); var dto=dados(f,2);
        var segundo=new ItemComandaCadastroDTO(); segundo.setProdutoId(g.produto()); segundo.setQuantidade(1); segundo.setPrecoUnitario(20.0);
        dto.setItens(List.of(dto.getItens().getFirst(),segundo)); var c=service.abrirComanda(dto);
        assertThrows(RuntimeException.class,()->service.fecharComanda(c.getId(),"PIX"));
        assertEquals(10.0,produtos.findById(f.produto()).orElseThrow().getQuantidade()); assertTrue(movimentos.findByProdutoId(f.produto()).isEmpty());
    }
    @Test void mesaOcupadaNaoGeraOutraComanda() {
        Fixture f=fixture(10); service.abrirComanda(dados(f,1));
        assertThrows(RuntimeException.class,()->service.abrirComanda(dados(f,1)));
    }
    @Test void cancelarComandaAbertaLiberaMesaSemMexerNoSaldo() {
        Fixture f=fixture(10); var c=service.abrirComanda(dados(f,2)); service.deletarComanda(c.getId());
        assertEquals("CANCELADA",comandas.findById(c.getId()).orElseThrow().getStatus());
        assertEquals(10.0,produtos.findById(f.produto()).orElseThrow().getQuantidade());
        assertEquals(StatusMesa.DISPONIVEL,mesas.findById(f.mesa()).orElseThrow().getStatus());
    }
    MovimentoEstoqueCadastroDTO movimento(Long id,String tipo,double quantidade) {
        var dto=new MovimentoEstoqueCadastroDTO(); dto.setProdutoId(id); dto.setTipo(tipo); dto.setQuantidade(quantidade); return dto;
    }
    @Test void editarExcluirMovimentoCorrigeSaldo() {
        Fixture f=fixture(10); var m=estoque.cadastrarMovimento(movimento(f.produto(),"ENTRADA",5));
        estoque.atualizarMovimento(m.getId(),movimento(f.produto(),"ENTRADA",2));
        assertEquals(12.0,produtos.findById(f.produto()).orElseThrow().getQuantidade());
        estoque.deletarMovimento(m.getId()); assertEquals(10.0,produtos.findById(f.produto()).orElseThrow().getQuantidade());
    }
    @Test void impedeExcluirEntradaJaConsumidaOuMovimentoAutomatico() {
        Fixture f=fixture(0); var entrada=estoque.cadastrarMovimento(movimento(f.produto(),"ENTRADA",5));
        var saida=estoque.registrarSaidaProduto(f.produto(),4,"COMANDA",123L);
        assertThrows(RuntimeException.class,()->estoque.deletarMovimento(entrada.getId()));
        assertThrows(RuntimeException.class,()->estoque.deletarMovimento(saida.getId()));
        assertEquals(1.0,produtos.findById(f.produto()).orElseThrow().getQuantidade());
    }
    @Test void movimentaInsumoERejeitaValoresInvalidos() {
        Insumo i=insumos.save(new Insumo("Farinha teste",2.0,"kg"));
        var d=new MovimentoEstoqueCadastroDTO(); d.setInsumoId(i.getId()); d.setTipo("ENTRADA"); d.setQuantidade(3.0); estoque.cadastrarMovimento(d);
        assertEquals(5.0,insumos.findById(i.getId()).orElseThrow().getQuantidade());
        d.setQuantidade(Double.NaN); assertThrows(RuntimeException.class,()->estoque.cadastrarMovimento(d));
        d.setQuantidade(1.0); d.setProdutoId(1L); assertThrows(RuntimeException.class,()->estoque.cadastrarMovimento(d));
    }
    @Test void exigeLoginCsrfEPerfis() throws Exception {
        mvc.perform(get("/api/produtos")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/comandas").with(user("admin").roles("ADMINISTRADOR")).contentType("application/json").content("{}")).andExpect(status().isForbidden());
        for(String path:List.of("/api/usuarios","/api/contas","/api/transacoes","/api/relatorios/financeiro/dados","/api/dashboard/resumo")) mvc.perform(get(path).with(user("atendente").roles("ATENDENTE"))).andExpect(status().isForbidden());
        mvc.perform(get("/api/produtos").with(user("atendente").roles("ATENDENTE"))).andExpect(status().isOk());
        mvc.perform(get("/api/usuarios").with(user("gerente").roles("GERENTE"))).andExpect(status().isForbidden());
        mvc.perform(get("/api/relatorios/financeiro/dados").with(user("gerente").roles("GERENTE"))).andExpect(status().isOk());
    }
    @Test void loginRealComTokenCsrfESessaoNaoExibeSenha() throws Exception {
        var u=usuarios.save(new Usuario("Login teste",UUID.randomUUID()+"@teste.com",encoder.encode("SenhaDeTeste123!"),PerfilUsuario.ADMINISTRADOR));
        var csrf=mvc.perform(get("/api/auth/csrf")).andExpect(status().isOk()).andReturn();
        var token=json.readTree(csrf.getResponse().getContentAsString());
        var session=(MockHttpSession)csrf.getRequest().getSession();
        mvc.perform(post("/api/auth/login").session(session).header(token.get("headerName").asText(),token.get("token").asText()).param("email",u.getEmail()).param("password","SenhaDeTeste123!")).andExpect(status().isOk());
        mvc.perform(get("/api/auth/me").session(session)).andExpect(status().isOk()).andExpect(jsonPath("$.id").value(u.getId())).andExpect(jsonPath("$.senha").doesNotExist());
        mvc.perform(get("/api/usuarios").session(session)).andExpect(status().isOk()).andExpect(jsonPath("$[0].senha").doesNotExist());
        mvc.perform(post("/api/auth/logout").session(session).with(csrf())).andExpect(status().isNoContent());
        mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
    }
    @Test void loginIncorretoECorsNaoAutorizado() throws Exception {
        mvc.perform(post("/api/auth/login").with(csrf()).param("email","inexistente@teste.com").param("password","incorreta")).andExpect(status().isUnauthorized());
        mvc.perform(options("/api/produtos").header("Origin","https://site-desconhecido.example").header("Access-Control-Request-Method","GET")).andExpect(status().isForbidden());
        mvc.perform(options("/api/produtos").header("Origin","http://localhost:3000").header("Access-Control-Request-Method","GET")).andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Credentials","true"));
    }
    @Test void fechamentoConcorrenteNaoDuplicaVenda() throws Exception {
        Fixture f=fixture(10); var c=service.abrirComanda(dados(f,2));
        var executor=java.util.concurrent.Executors.newFixedThreadPool(2);
        var inicio=new java.util.concurrent.CountDownLatch(1);
        try {
            var a=executor.submit(()-> { inicio.await(); return service.fecharComanda(c.getId(),"PIX"); });
            var b=executor.submit(()-> { inicio.await(); return service.fecharComanda(c.getId(),"PIX"); });
            inicio.countDown(); a.get(15,java.util.concurrent.TimeUnit.SECONDS); b.get(15,java.util.concurrent.TimeUnit.SECONDS);
            assertEquals(8.0,produtos.findById(f.produto()).orElseThrow().getQuantidade());
            assertEquals(1,transacoes.findByComandaId(c.getId()).size());
            assertEquals(1,movimentos.findByProdutoId(f.produto()).size());
        } finally { executor.shutdownNow(); }
    }
    @Test void trocaDeSenhaRevogaSessao() throws Exception {
        var u=usuarios.save(new Usuario("Revogação teste",UUID.randomUUID()+"@teste.com",encoder.encode("SenhaDeTeste123!"),PerfilUsuario.ADMINISTRADOR));
        var login=mvc.perform(post("/api/auth/login").with(csrf()).param("email",u.getEmail()).param("password","SenhaDeTeste123!")).andExpect(status().isOk()).andReturn();
        var session=(MockHttpSession)login.getRequest().getSession();
        u.setSenha(encoder.encode("OutraSenhaTeste123!")); usuarios.save(u);
        mvc.perform(get("/api/auth/me").session(session)).andExpect(status().isUnauthorized());
    }
    @Test void comandaFechadaNaoPermiteEditarItens() {
        Fixture f=fixture(10); var c=service.abrirComanda(dados(f,2)); service.fecharComanda(c.getId(),"PIX");
        Long itemId=itens.findByComandaId(c.getId()).getFirst().getId();
        assertThrows(RuntimeException.class,()->itensService.atualizarItemComanda(c.getId(),itemId,dados(f,3).getItens().getFirst()));
        assertThrows(RuntimeException.class,()->itensService.deletarItemComanda(c.getId(),itemId));
        assertEquals(8.0,produtos.findById(f.produto()).orElseThrow().getQuantidade());
    }
    @Test void quantidadesDecimaisNaoGeramSaldoNegativoPorArredondamento() {
        Fixture f=fixture(0.3);
        estoque.cadastrarMovimento(movimento(f.produto(),"SAIDA",0.1));
        estoque.cadastrarMovimento(movimento(f.produto(),"SAIDA",0.2));
        assertEquals(0.0,produtos.findById(f.produto()).orElseThrow().getQuantidade());
    }
    @Test void usuarioDeAberturaVemDaSessaoNaoDoPayload() throws Exception {
        Fixture f=fixture(10); var usuario=usuarios.findById(f.usuario()).orElseThrow();
        var login=mvc.perform(post("/api/auth/login").with(csrf()).param("email",usuario.getEmail()).param("password","SenhaDeTeste123!")).andExpect(status().isOk()).andReturn();
        var d=dados(f,1); d.setUsuarioId(999999L);
        mvc.perform(post("/api/comandas").session((MockHttpSession)login.getRequest().getSession()).with(csrf()).contentType("application/json").content(json.writeValueAsString(d)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.usuario.id").value(f.usuario())).andExpect(jsonPath("$.usuario.senha").doesNotExist());
    }
}
