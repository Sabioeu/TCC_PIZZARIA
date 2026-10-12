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
    @Autowired NumeracaoComandaService numeracaoDiaria;

    @Test void numerosDiariosSimultaneosSaoDistintosEVinculosUsamId() throws Exception {
        Fixture f=fixture(10);
        var inicio=new java.util.concurrent.CountDownLatch(1);
        var executor=java.util.concurrent.Executors.newFixedThreadPool(4);
        try {
            var tarefas=new ArrayList<java.util.concurrent.Future<Comanda>>();
            for(int i=0;i<4;i++) tarefas.add(executor.submit(() -> {
                inicio.await(); var d=dados(f,1); d.setMesaId(null); d.setTipoAtendimento(TipoAtendimento.RETIRADA);
                return service.abrirComanda(d);
            }));
            inicio.countDown(); var criadas=new ArrayList<Comanda>();
            for(var tarefa:tarefas) criadas.add(tarefa.get(25,java.util.concurrent.TimeUnit.SECONDS));
            assertEquals(4,criadas.stream().map(Comanda::getNumeroDiario).distinct().count());
            assertEquals(4,criadas.stream().map(Comanda::getId).distinct().count());
            assertEquals(1,criadas.stream().map(Comanda::getDataNumeracao).distinct().count());
            assertTrue(criadas.stream().allMatch(c -> c.getDataNumeracao().equals(c.getDataHoraAbertura().toLocalDate())));
        } finally { executor.shutdownNow(); }
    }
    @Test void migraReferenciaDeLegadosSemMudarNumeroOriginalSaldoOuId() {
        Fixture f=fixture(10);
        var dia=java.time.LocalDate.of(2011,1,10);
        var anteriores=new ArrayList<Comanda>();
        for(int i=0;i<2;i++) {
            var c=new Comanda(); c.setNumero(1700000000+i); c.setStatus("FECHADA"); c.setTotal(20.0);
            c.setUsuario(usuarios.findById(f.usuario()).orElseThrow()); c.setCliente(clientes.findById(f.cliente()).orElseThrow());
            c.setDataHoraAbertura(dia.atTime(10+i,0)); anteriores.add(comandas.save(c));
        }
        numeracaoDiaria.run(null);
        for(int i=0;i<2;i++) {
            var c=comandas.findById(anteriores.get(i).getId()).orElseThrow();
            assertEquals(1700000000+i,c.getNumero()); assertEquals(i+1,c.getNumeroDiario()); assertEquals(dia,c.getDataNumeracao());
        }
        numeracaoDiaria.run(null); // Inicialização repetida não renumera novamente.
        assertEquals(1,comandas.findById(anteriores.getFirst().getId()).orElseThrow().getNumeroDiario());
        assertEquals(10.0,produtos.findById(f.produto()).orElseThrow().getQuantidade());
        assertTrue(movimentos.findByProdutoId(f.produto()).isEmpty());
    }
    @Test void bancoAceitaMesmoNumeroEmDiasDistintosMasRecusaDuplicidadeNoMesmoDia() {
        Fixture f=fixture(10);
        var dia=java.time.LocalDate.of(2031,1,10);
        var ids=new ArrayList<Long>();
        for(int i=0;i<2;i++) {
            var c=new Comanda(1800000000+i,dia.plusDays(i).atStartOfDay(),"FECHADA",20.0,
                    usuarios.findById(f.usuario()).orElseThrow(),clientes.findById(f.cliente()).orElseThrow(),null);
            c.setNumeroDiario(1); c.setDataNumeracao(dia.plusDays(i)); ids.add(comandas.saveAndFlush(c).getId());
        }
        assertNotEquals(ids.getFirst(),ids.getLast());
        var repetida=new Comanda(1800000002,dia.atTime(12,0),"FECHADA",20.0,
                usuarios.findById(f.usuario()).orElseThrow(),clientes.findById(f.cliente()).orElseThrow(),null);
        repetida.setNumeroDiario(1); repetida.setDataNumeracao(dia);
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class,() -> comandas.saveAndFlush(repetida));
        assertEquals(1,comandas.findById(ids.getFirst()).orElseThrow().getNumeroDiario());
    }
    @Autowired DisponibilidadeEstoqueService disponibilidade;
    @Autowired ContaService contasService;
    @Autowired ContasApagarRepository contas;
    @Autowired FornecedorRepository fornecedores;
    @Autowired TransacaoFinanceiraService financeiroService;
    @Autowired PedidoService pedidosService;
    @Autowired PedidoRepository pedidos;
    @Autowired ItemPedidoRepository itensPedidos;

    PedidoCadastroDTO pedidoLegado(Fixture f, int quantidade, String tipo) {
        var dados = new PedidoCadastroDTO();
        dados.setClienteId(f.cliente()); dados.setUsuarioId(f.usuario()); dados.setTipo(tipo);
        var item = new ItemPedidoDTO(); item.setProdutoId(f.produto()); item.setQuantidade(quantidade);
        item.setPrecoUnitario(new BigDecimal("0.01"));
        dados.setItens(List.of(item));
        return dados;
    }

    @Test void pedidoLegadoUsaPrecoDoServidorERejeitaTipoStatusQuantidadeInvalidos() {
        Fixture f = fixture(10);
        var pedido = pedidosService.cadastrarPedido(pedidoLegado(f, 2, "RETIRADA"));
        assertEquals(0, new BigDecimal("20.00").compareTo(itensPedidos.findByPedidoId(pedido.getId()).getFirst().getPrecoUnitario()));
        assertEquals(8.0, produtos.findById(f.produto()).orElseThrow().getQuantidade());
        assertThrows(IllegalArgumentException.class, () -> pedidosService.cadastrarPedido(pedidoLegado(f, 0, "DELIVERY")));
        assertThrows(IllegalArgumentException.class, () -> pedidosService.cadastrarPedido(pedidoLegado(f, 1, "TIPO INVENTADO")));
        assertThrows(IllegalArgumentException.class, () -> pedidosService.atualizarStatusPedido(pedido.getId(), "STATUS INVENTADO"));
        assertEquals("ABERTO", pedidos.findById(pedido.getId()).orElseThrow().getStatus());
        assertEquals(8.0, produtos.findById(f.produto()).orElseThrow().getQuantidade());
    }

    @Test void pedidoLegadoValidaItensAninhadosPelaApi() throws Exception {
        Fixture f = fixture(10);
        mvc.perform(post("/api/pedidos").with(user("admin").roles("ADMINISTRADOR")).with(csrf())
                .contentType("application/json").content(json.writeValueAsString(pedidoLegado(f, -2, "PRESENCIAL"))))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("message").value("Revise os campos informados."));
        assertEquals(10.0, produtos.findById(f.produto()).orElseThrow().getQuantidade());
    }

    ContaInputDTO novaConta(String valor, int parcelas) {
        Fornecedor fornecedor = new Fornecedor();
        fornecedor.setNome("Fornecedor teste " + UUID.randomUUID());
        fornecedor.setCnpjCpf(UUID.randomUUID().toString().replace("-", "").substring(0, 14));
        fornecedor = fornecedores.save(fornecedor);
        ContaInputDTO dto = new ContaInputDTO();
        dto.setFornecedorId(fornecedor.getId());
        dto.setDescricao("Conta de teste");
        dto.setPrimeiroVencimento(java.time.LocalDate.now().minusDays(5));
        dto.setParcelas(parcelas);
        dto.setValorTotal(new BigDecimal(valor));
        return dto;
    }

    @Test void parcelamentoPreservaCentavosETotal() {
        var grupo = contasService.criarContas(novaConta("100.00", 3));
        assertEquals(new BigDecimal("33.33"), grupo.getFirst().getValor());
        assertEquals(new BigDecimal("33.34"), grupo.getLast().getValor());
        assertEquals(new BigDecimal("100.00"), grupo.stream().map(ContaAPagar::getValor).reduce(BigDecimal.ZERO, BigDecimal::add));
        assertThrows(IllegalArgumentException.class, () -> contasService.criarContas(novaConta("0.01", 2)));
        assertThrows(IllegalArgumentException.class, () -> contasService.criarContas(novaConta("1.00", 0)));
    }

    @Test void consultaDeContasCalculaVencimentoSemSalvarENaoReabrePagamento() {
        var conta = contasService.criarContas(novaConta("10.00", 1)).getFirst();
        var exibida = contasService.buscarComFiltros(conta.getFornecedor().getId(), null).getFirst();
        assertEquals(StatusConta.VENCIDA, exibida.getStatus());
        assertEquals(StatusConta.PENDENTE, contas.findById(conta.getId()).orElseThrow().getStatus());
        contasService.pagar(conta.getId());
        assertEquals(StatusConta.PAGA, contasService.buscarComFiltros(conta.getFornecedor().getId(), null).getFirst().getStatus());
        assertEquals(StatusConta.PAGA, contas.findById(conta.getId()).orElseThrow().getStatus());
    }

    @Test void exclusaoDeCarneRemoveSomentePendentesEPreservaPagamentos() {
        var grupo = contasService.criarContas(novaConta("100.00", 3));
        contasService.pagar(grupo.getFirst().getId());
        contasService.excluir(grupo.get(1).getId());
        assertEquals(StatusConta.PAGA, contas.findById(grupo.getFirst().getId()).orElseThrow().getStatus());
        assertFalse(contas.existsById(grupo.get(1).getId()));
        assertFalse(contas.existsById(grupo.getLast().getId()));
        assertThrows(IllegalArgumentException.class, () -> contasService.excluir(grupo.getFirst().getId()));
    }

    @Test void pagamentoConcorrenteComEdicaoNuncaEhReaberto() throws Exception {
        var conta = contasService.criarContas(novaConta("10.00", 1)).getFirst();
        var dto = new ContaAtualizacaoDTO();
        dto.setDescricao("Descrição revisada"); dto.setValor(new BigDecimal("12.00"));
        dto.setDataVencimento(java.time.LocalDate.now().plusDays(5));
        var inicio = new java.util.concurrent.CountDownLatch(1);
        var executor = java.util.concurrent.Executors.newFixedThreadPool(2);
        try {
            var pagar = executor.submit(() -> { inicio.await(); return contasService.pagar(conta.getId()); });
            var editar = executor.submit(() -> {
                inicio.await();
                try { contasService.atualizar(conta.getId(), dto); } catch (IllegalArgumentException expected) { /* Pagamento venceu a corrida. */ }
                return true;
            });
            inicio.countDown(); pagar.get(15, java.util.concurrent.TimeUnit.SECONDS); editar.get(15, java.util.concurrent.TimeUnit.SECONDS);
            assertEquals(StatusConta.PAGA, contas.findById(conta.getId()).orElseThrow().getStatus());
        } finally { executor.shutdownNow(); }
    }

    @Test void contasValidamEntradasAntesDeGravar() throws Exception {
        mvc.perform(post("/api/contas").with(user("admin").roles("ADMINISTRADOR")).with(csrf())
                .contentType("application/json").content("{\"valorTotal\":-10,\"parcelas\":0}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("message").value("Revise os campos informados."));
        mvc.perform(put("/api/contas/1").with(user("admin").roles("ADMINISTRADOR")).with(csrf())
                .contentType("application/json").content("{\"valor\":0}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/contas").with(user("admin").roles("ADMINISTRADOR")).with(csrf())
                .contentType("application/json").content("{dados invalidos}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("message").value("Dados inválidos. Revise os campos e tente novamente."));
    }

    @Test void recebimentoAutomaticoNaoAceitaAdulteracaoExclusaoOuDuplicidade() {
        Fixture f = fixture(10);
        var comanda = service.abrirComanda(dados(f, 2));
        service.fecharComanda(comanda.getId(), "PIX");
        var recebimento = transacoes.findByComandaId(comanda.getId()).getFirst();
        var dto = new TransacaoFinanceiraCadastroDTO();
        dto.setTipo("PIX"); dto.setValor(1.0); dto.setDescricao("Alterado");
        assertThrows(IllegalArgumentException.class, () -> financeiroService.atualizarTransacao(recebimento.getId(), dto));
        assertThrows(IllegalArgumentException.class, () -> financeiroService.deletarTransacao(recebimento.getId()));
        dto.setComandaId(comanda.getId());
        assertThrows(IllegalArgumentException.class, () -> financeiroService.cadastrarTransacao(dto));
        assertEquals(1, transacoes.findByComandaId(comanda.getId()).size());
        assertEquals(40.0, transacoes.findById(recebimento.getId()).orElseThrow().getValor());
    }
    @Test void estoqueInsuficienteBloqueiaAberturaParaTodosOsTiposSemOcuparMesa() {
        for(var tipo:TipoAtendimento.values()) {
            Fixture f=fixture(1); var d=dados(f,2); d.setTipoAtendimento(tipo);
            if(tipo==TipoAtendimento.DELIVERY) { d.setEnderecoEntrega("Rua Teste, 10"); d.setTelefoneContato("44999999999"); }
            assertThrows(RuntimeException.class,()->service.abrirComanda(d));
            assertEquals(StatusMesa.DISPONIVEL,mesas.findById(f.mesa()).orElseThrow().getStatus());
            assertEquals(1.0,produtos.findById(f.produto()).orElseThrow().getQuantidade());
        }
    }
    @Test void reservaBloqueiaOutrosPedidosESaidasManuaisELiberaAoCancelar() {
        Fixture f=fixture(2); var c=service.abrirComanda(dados(f,2));
        var outro=dados(f,1); outro.setMesaId(null); outro.setTipoAtendimento(TipoAtendimento.RETIRADA);
        assertThrows(RuntimeException.class,()->service.abrirComanda(outro));
        assertThrows(RuntimeException.class,()->estoque.cadastrarMovimento(movimento(f.produto(),"SAIDA",1)));
        assertEquals(2.0,produtos.findById(f.produto()).orElseThrow().getQuantidade());
        service.deletarComanda(c.getId());
        assertNotNull(service.abrirComanda(outro));
    }
    @Test void adicionaEEditaItensRespeitandoSaldoDisponivelEAgrupaLinhasDuplicadas() {
        Fixture f=fixture(3); var d=dados(f,2); var duplicado=dados(f,2).getItens().getFirst(); d.setItens(List.of(d.getItens().getFirst(),duplicado));
        assertThrows(RuntimeException.class,()->service.abrirComanda(d));
        var c=service.abrirComanda(dados(f,2));
        assertThrows(RuntimeException.class,()->service.adicionarItensAComanda(c.getId(),dados(f,2)));
        assertThrows(RuntimeException.class,()->itensService.cadastrarItemComanda(c.getId(),dados(f,2).getItens().getFirst()));
        var item=itens.findByComandaId(c.getId()).getFirst();
        assertThrows(RuntimeException.class,()->itensService.atualizarItemComanda(c.getId(),item.getId(),dados(f,4).getItens().getFirst()));
        itensService.atualizarItemComanda(c.getId(),item.getId(),dados(f,1).getItens().getFirst());
        var outro=dados(f,2); outro.setMesaId(null); outro.setTipoAtendimento(TipoAtendimento.RETIRADA); assertNotNull(service.abrirComanda(outro));
    }
    @Test void pedidosSimultaneosNaoReservamOMesmoSaldo() throws Exception {
        Fixture f=fixture(1); var inicio=new java.util.concurrent.CountDownLatch(1); var executor=java.util.concurrent.Executors.newFixedThreadPool(2);
        java.util.concurrent.Callable<Boolean> abrir=()-> { inicio.await(); var d=dados(f,1); d.setMesaId(null); d.setTipoAtendimento(TipoAtendimento.RETIRADA); try { service.abrirComanda(d); return true; } catch(org.springframework.web.server.ResponseStatusException ex) { return false; } };
        try { var a=executor.submit(abrir); var b=executor.submit(abrir); inicio.countDown(); assertNotEquals(a.get(20,java.util.concurrent.TimeUnit.SECONDS),b.get(20,java.util.concurrent.TimeUnit.SECONDS)); }
        finally { executor.shutdownNow(); }
        assertEquals(1.0,produtos.findById(f.produto()).orElseThrow().getQuantidade());
    }
    @Test void novosCadastrosExigemAprovacaoEContaBloqueadaPerdeSessao() throws Exception {
        String email=UUID.randomUUID()+"@teste.com";
        String corpo=json.writeValueAsString(Map.of("email",email,"senha","SenhaTeste123!","confirmarSenha","SenhaTeste123!","ativo",true));
        mvc.perform(post("/api/auth/registro").with(csrf()).contentType("application/json").content(corpo)).andExpect(status().isCreated()).andExpect(jsonPath("ativo").value(false));
        mvc.perform(post("/api/auth/login").with(csrf()).param("email",email).param("password","SenhaTeste123!")).andExpect(status().isUnauthorized());
        var u=usuarios.findByEmailIgnoreCase(email).orElseThrow();
        String aprovacao=json.writeValueAsString(Map.of("nome",u.getNome(),"email",email,"perfil","ATENDENTE","ativo",true));
        mvc.perform(put("/api/usuarios/"+u.getId()).with(user("atendente").roles("ATENDENTE")).with(csrf()).contentType("application/json").content(aprovacao)).andExpect(status().isForbidden());
        mvc.perform(put("/api/usuarios/"+u.getId()).with(user("admin").roles("ADMINISTRADOR")).with(csrf()).contentType("application/json").content(aprovacao)).andExpect(status().isOk());
        var login=mvc.perform(post("/api/auth/login").with(csrf()).param("email",email).param("password","SenhaTeste123!")).andExpect(status().isOk()).andReturn();
        var sessao=(MockHttpSession)login.getRequest().getSession();
        u=usuarios.findById(u.getId()).orElseThrow(); u.setAtivo(false); usuarios.save(u);
        mvc.perform(get("/api/auth/me").session(sessao)).andExpect(status().isUnauthorized());
    }
    @Test void deliveryComMesaDeReferenciaNaoOcupaNemLiberaMesaEIncluiTaxa() {
        Fixture f=fixture(10); var presencial=service.abrirComanda(dados(f,1));
        var d=dados(f,2); d.setTipoAtendimento(TipoAtendimento.DELIVERY); d.setEnderecoEntrega("Rua Teste, 20, Centro"); d.setTelefoneContato("44999999999"); d.setTaxaEntrega(new BigDecimal("7.50"));
        var c=service.abrirComanda(d);
        assertEquals(47.5,c.getTotal()); assertEquals(StatusMesa.OCUPADA,mesas.findById(f.mesa()).orElseThrow().getStatus());
        assertThrows(RuntimeException.class,()->service.fecharComanda(c.getId(),"PIX"));
        assertThrows(RuntimeException.class,()->service.atualizarEtapa(c.getId(),EtapaAtendimento.CONCLUIDO));
        service.atualizarEtapa(c.getId(),EtapaAtendimento.EM_PREPARO);
        assertThrows(RuntimeException.class,()->service.adicionarItensAComanda(c.getId(),d));
        var item=itens.findByComandaId(c.getId()).getFirst();
        assertThrows(RuntimeException.class,()->itensService.atualizarItemComanda(c.getId(),item.getId(),d.getItens().getFirst()));
        service.atualizarEtapa(c.getId(),EtapaAtendimento.PRONTO); service.atualizarEtapa(c.getId(),EtapaAtendimento.EM_ENTREGA); service.atualizarEtapa(c.getId(),EtapaAtendimento.CONCLUIDO);
        service.fecharComanda(c.getId(),"PIX"); service.fecharComanda(c.getId(),"PIX");
        assertEquals(8.0,produtos.findById(f.produto()).orElseThrow().getQuantidade()); assertEquals(47.5,transacoes.findByComandaId(c.getId()).getFirst().getValor());
        assertEquals(StatusMesa.OCUPADA,mesas.findById(f.mesa()).orElseThrow().getStatus());
        service.deletarComanda(presencial.getId());
    }
    @Test void retiradaSemMesaEValidacoesDeAtendimento() {
        Fixture f=fixture(10); var d=dados(f,1); d.setMesaId(null); d.setTipoAtendimento(TipoAtendimento.PRESENCIAL);
        assertThrows(RuntimeException.class,()->service.abrirComanda(d));
        d.setTipoAtendimento(TipoAtendimento.DELIVERY); assertThrows(RuntimeException.class,()->service.abrirComanda(d));
        d.setTipoAtendimento(TipoAtendimento.RETIRADA); d.setTaxaEntrega(new BigDecimal("3")); assertThrows(RuntimeException.class,()->service.abrirComanda(d));
        d.setTaxaEntrega(BigDecimal.ZERO); var c=service.abrirComanda(d); assertNull(c.getMesa());
        service.atualizarEtapa(c.getId(),EtapaAtendimento.EM_PREPARO); service.atualizarEtapa(c.getId(),EtapaAtendimento.PRONTO);
        assertThrows(RuntimeException.class,()->service.atualizarEtapa(c.getId(),EtapaAtendimento.EM_ENTREGA));
        service.atualizarEtapa(c.getId(),EtapaAtendimento.CONCLUIDO); service.fecharComanda(c.getId(),"DINHEIRO");
        assertEquals(StatusMesa.DISPONIVEL,mesas.findById(f.mesa()).orElseThrow().getStatus());
    }
    @Test void recalculoDeItensPreservaTaxaEReferenciaNaoLiberaMesaNoCancelamento() {
        Fixture f=fixture(10); service.abrirComanda(dados(f,1));
        var d=dados(f,1); d.setTipoAtendimento(TipoAtendimento.DELIVERY); d.setEnderecoEntrega("Rua Teste, 10"); d.setTelefoneContato("44999999999"); d.setTaxaEntrega(new BigDecimal("5.00"));
        var c=service.abrirComanda(d); var item=itens.findByComandaId(c.getId()).getFirst();
        var atualizado=d.getItens().getFirst(); atualizado.setQuantidade(2);
        itensService.atualizarItemComanda(c.getId(),item.getId(),atualizado);
        assertEquals(45.0,comandas.findById(c.getId()).orElseThrow().getTotal());
        service.deletarComanda(c.getId()); assertEquals(StatusMesa.OCUPADA,mesas.findById(f.mesa()).orElseThrow().getStatus());
    }
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
        Fixture f=fixture(2); var comanda=service.abrirComanda(dados(f,2));
        // Simula saldo alterado fora das APIs: o faturamento mantém a última defesa.
        var produto=produtos.findById(f.produto()).orElseThrow(); produto.setQuantidade(1.0); produtos.save(produto);
        assertThrows(RuntimeException.class,()->service.fecharComanda(comanda.getId(),"PIX"));
        assertEquals("ABERTA",comandas.findById(comanda.getId()).orElseThrow().getStatus());
        assertEquals(1.0,produtos.findById(f.produto()).orElseThrow().getQuantidade());
        assertTrue(transacoes.findByComandaId(comanda.getId()).isEmpty());
        assertTrue(movimentos.findByProdutoId(f.produto()).isEmpty());
        assertEquals(StatusMesa.OCUPADA,mesas.findById(f.mesa()).orElseThrow().getStatus());
    }
    @Test void falhaNoSegundoProdutoTambemRevertePrimeiraBaixa() {
        Fixture f=fixture(10); Fixture g=fixture(1); var dto=dados(f,2);
        var segundo=new ItemComandaCadastroDTO(); segundo.setProdutoId(g.produto()); segundo.setQuantidade(1); segundo.setPrecoUnitario(20.0);
        dto.setItens(List.of(dto.getItens().getFirst(),segundo)); var c=service.abrirComanda(dto);
        var produto=produtos.findById(g.produto()).orElseThrow(); produto.setQuantidade(0.0); produtos.save(produto);
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
    @Test void fichaTecnicaExigePerfilDeGestaoSemBloquearConsultaDoCardapio() throws Exception {
        Fixture f = fixture(10);
        String path = "/api/produtos/" + f.produto() + "/ficha-tecnica";
        mvc.perform(get(path)).andExpect(status().isUnauthorized());
        mvc.perform(get(path).with(user("atendente").roles("ATENDENTE"))).andExpect(status().isForbidden());
        mvc.perform(put(path).with(user("atendente").roles("ATENDENTE")).with(csrf())
                .contentType("application/json").content("{\"porIngredientes\":false,\"componentes\":[]}"))
                .andExpect(status().isForbidden());
        mvc.perform(get(path).with(user("gerente").roles("GERENTE"))).andExpect(status().isOk());
        mvc.perform(put(path).with(user("admin").roles("ADMINISTRADOR"))
                .contentType("application/json").content("{\"porIngredientes\":false,\"componentes\":[]}"))
                .andExpect(status().isForbidden()); // CSRF continua obrigatório.
        mvc.perform(put(path).with(user("gerente").roles("GERENTE")).with(csrf())
                .contentType("application/json").content("{\"porIngredientes\":false,\"componentes\":[]}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.porIngredientes").value(false));
        mvc.perform(get("/api/produtos/disponibilidade").with(user("atendente").roles("ATENDENTE")))
                .andExpect(status().isOk());
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
