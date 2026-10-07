package com.integrador.api.pizza.service;

import com.integrador.api.pizza.enums.StatusConta;
import com.integrador.api.pizza.model.ContaAPagar;
import com.integrador.api.pizza.repository.*;
import net.sf.jasperreports.engine.*;
import net.sf.jasperreports.engine.data.JRMapCollectionDataSource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

/** Relatórios somente leitura: não alteram saldos nem pagamentos. */
@Service
public class RelatorioService {
    private final MovimentoEstoqueRepository movimentos;
    private final ProdutoRepository produtos;
    private final InsumoRepository insumos;
    private final TransacaoFinanceiraRepository transacoes;
    private final ContasApagarRepository contas;
    private JasperReport modelo;
    private static final DateTimeFormatter DATA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter HORA = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    public record Linha(List<String> celulas) {}
    public record Indicador(String titulo, String valor) {}
    public record Resultado(String titulo, String periodo, String observacao, List<String> colunas, List<Linha> linhas, List<Indicador> indicadores) {}
    public RelatorioService(MovimentoEstoqueRepository m, ProdutoRepository p, InsumoRepository i, TransacaoFinanceiraRepository t, ContasApagarRepository c) {
        movimentos=m; produtos=p; insumos=i; transacoes=t; contas=c;
    }
    @Transactional(readOnly=true)
    public Resultado consultar(String nome, LocalDate inicio, LocalDate fim, String busca, String status) {
        if (inicio!=null && fim!=null && inicio.isAfter(fim)) throw invalido("A data inicial deve ser anterior ou igual à final.");
        String termo = busca==null ? "" : busca.trim().toLowerCase(Locale.ROOT);
        List<Linha> linhas = new ArrayList<>();
        List<Indicador> indicadores = new ArrayList<>();
        String periodo = (inicio==null ? "Desde o primeiro registro" : inicio.format(DATA))+" até "+(fim==null ? "o último registro" : fim.format(DATA));
        String titulo; String nota; List<String> colunas;
        switch(nome) {
            case "estoque-entradas", "estoque-saidas", "relatorio_final" -> {
                String tipo=nome.equals("estoque-entradas") ? "ENTRADA" : nome.equals("estoque-saidas") ? "SAIDA" : "";
                titulo=tipo.equals("ENTRADA") ? "Entradas de estoque" : tipo.equals("SAIDA") ? "Saídas de estoque" : "Movimentação de estoque";
                colunas=List.of("Data e hora","Item","Categoria","Movimento / origem","Quantidade","Unidade");
                nota="Quantidades de unidades diferentes não são somadas. Histórico registrado; não reconstrói saldos anteriores.";
                Map<String,BigDecimal> unidades=new TreeMap<>();
                movimentos.findAll().stream().sorted(Comparator.comparing(m -> m.getDataHora())).forEach(m -> {
                    String item=m.getProduto()!=null ? m.getProduto().getNome() : m.getInsumo()!=null ? m.getInsumo().getNome() : "Item não identificado";
                    if ((!tipo.isEmpty() && !tipo.equals(m.getTipo())) || !noPeriodo(m.getDataHora().toLocalDate(),inicio,fim) || !contem(item,termo)) return;
                    String unidade=m.getInsumo()!=null ? texto(m.getInsumo().getUnidade()) : "un";
                    String origem=m.getOrigem()==null ? m.getTipo() : m.getTipo()+" / "+m.getOrigem()+" #"+m.getReferencia();
                    linhas.add(linha(m.getDataHora().format(HORA),item,m.getProduto()!=null ? "Produto" : m.getInsumo()!=null ? "Insumo" : "Sem vínculo",origem,numero(BigDecimal.valueOf(m.getQuantidade())),unidade));
                    if(!tipo.isEmpty()) unidades.merge(unidade,BigDecimal.valueOf(m.getQuantidade()),BigDecimal::add);
                });
                unidades.forEach((u,v)->indicadores.add(new Indicador("Quantidade ("+u+")",numero(v))));
            }
            case "estoque-posicao" -> {
                titulo="Posição atual do estoque"; periodo="Saldo cadastrado em "+LocalDateTime.now().format(HORA);
                colunas=List.of("Código","Item","Categoria","Saldo","Unidade","Situação");
                nota="Retrato atual, sem filtro de período. Produtos: baixo até 5 un, como na tela de estoque. Insumos: sem mínimo cadastrado.";
                produtos.findAll().forEach(p -> { if(contem(p.getNome(),termo)) linhas.add(linha("P-"+p.getId(),p.getNome(),"Produto",p.getQuantidade()==null ? "Não informado" : numero(BigDecimal.valueOf(p.getQuantidade())),"un",p.getQuantidade()==null ? "Não informado" : p.getQuantidade()<=5 ? "Baixo" : "Regular")); });
                insumos.findAll().forEach(i -> { if(contem(i.getNome(),termo)) linhas.add(linha("I-"+i.getId(),i.getNome(),"Insumo",i.getQuantidade()==null ? "Não informado" : numero(BigDecimal.valueOf(i.getQuantidade())),i.getUnidade(),"Sem mínimo definido")); });
                linhas.sort(Comparator.comparing(l->l.celulas().get(1),String.CASE_INSENSITIVE_ORDER));
                indicadores.add(new Indicador("Produtos com estoque baixo",String.valueOf(linhas.stream().filter(l->"Baixo".equals(l.celulas().get(5))).count())));
            }
            case "financeiro" -> {
                titulo="Financeiro: recebimentos e despesas pagas";
                colunas=List.of("Data e hora","Descrição","Natureza","Pagamento","Referência","Valor");
                nota="Recebimentos registrados e contas pagas pela data de pagamento. Saldo não é lucro nem extrato bancário. Crédito/débito são meios de pagamento. Contas pagas sem data não entram no saldo.";
                BigDecimal[] totais={BigDecimal.ZERO,BigDecimal.ZERO};
                transacoes.findAll().stream().sorted(Comparator.comparing(t->t.getDataHora())).forEach(t -> {
                    if(!noPeriodo(t.getDataHora().toLocalDate(),inicio,fim) || !contem(texto(t.getDescricao())+" "+texto(t.getTipo()),termo)) return;
                    BigDecimal valor=decimal(t.getValor()); totais[0]=totais[0].add(valor);
                    String ref=t.getComanda()!=null ? "Comanda #"+t.getComanda().getNumero() : t.getPedido()!=null ? "Pedido #"+t.getPedido().getId() : "Transação #"+t.getId();
                    linhas.add(linha(t.getDataHora().format(HORA),t.getDescricao(),"Recebimento",t.getTipo(),ref,moeda(valor)));
                });
                contas.findAll().stream().filter(c->c.getStatus()==StatusConta.PAGA).sorted(Comparator.comparing(ContaAPagar::getDataPagamento,Comparator.nullsLast(Comparator.naturalOrder()))).forEach(c -> {
                    if(c.getDataPagamento()==null || !noPeriodo(c.getDataPagamento(),inicio,fim) || !contem(texto(c.getDescricao())+" "+fornecedor(c),termo)) return;
                    BigDecimal valor=c.getValor()==null ? BigDecimal.ZERO : c.getValor(); totais[1]=totais[1].add(valor);
                    linhas.add(linha(c.getDataPagamento().format(DATA),c.getDescricao(),"Despesa paga","Não registrado","Conta #"+c.getId(),moeda(valor)));
                });
                indicadores.add(new Indicador("Recebimentos",moeda(totais[0])));
                indicadores.add(new Indicador("Despesas pagas",moeda(totais[1])));
                indicadores.add(new Indicador("Saldo dos registros",moeda(totais[0].subtract(totais[1]))));
                linhas.sort(Comparator.comparing(l -> l.celulas().get(0).length()==10
                        ? LocalDate.parse(l.celulas().get(0),DATA).atStartOfDay()
                        : LocalDateTime.parse(l.celulas().get(0),HORA)));
            }
            case "contas-a-pagar" -> {
                titulo="Contas a pagar";
                colunas=List.of("Vencimento","Descrição","Fornecedor","Situação","Pagamento","Valor");
                nota="Período filtrado pelo vencimento. Vencidas são calculadas sem alterar registros. Valores em aberto não são despesas pagas.";
                String filtro=status==null ? "" : status.toUpperCase(Locale.ROOT);
                if(!List.of("","PAGA","PENDENTE","VENCIDA").contains(filtro)) throw invalido("Situação inválida.");
                BigDecimal[] totais={BigDecimal.ZERO,BigDecimal.ZERO,BigDecimal.ZERO};
                contas.findAll().stream().sorted(Comparator.comparing(ContaAPagar::getDataVencimento,Comparator.nullsLast(Comparator.naturalOrder()))).forEach(c -> {
                    String situacao=c.getStatus()==StatusConta.PAGA ? "PAGA" : c.getDataVencimento()!=null && c.getDataVencimento().isBefore(LocalDate.now()) ? "VENCIDA" : "PENDENTE";
                    if(!noPeriodo(c.getDataVencimento(),inicio,fim) || (!filtro.isEmpty() && !filtro.equals(situacao)) || !contem(texto(c.getDescricao())+" "+fornecedor(c),termo)) return;
                    BigDecimal valor=c.getValor()==null ? BigDecimal.ZERO : c.getValor();
                    int indice=situacao.equals("PAGA") ? 0 : 1; totais[indice]=totais[indice].add(valor);
                    if(situacao.equals("VENCIDA")) totais[2]=totais[2].add(valor);
                    linhas.add(linha(c.getDataVencimento()==null ? "Não informado" : c.getDataVencimento().format(DATA),c.getDescricao(),fornecedor(c),situacao,c.getDataPagamento()==null ? "-" : c.getDataPagamento().format(DATA),moeda(valor)));
                });
                indicadores.add(new Indicador("Em aberto",moeda(totais[1])));
                indicadores.add(new Indicador("Vencidas (parte do aberto)",moeda(totais[2])));
                indicadores.add(new Indicador("Pagas",moeda(totais[0])));
            }
            default -> throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Relatório não encontrado.");
        }
        indicadores.add(0,new Indicador("Registros",String.valueOf(linhas.size())));
        if(!termo.isEmpty()) periodo+=" | Busca: "+busca.trim();
        if(nome.equals("contas-a-pagar") && status!=null && !status.isBlank()) periodo+=" | Situação: "+status;
        return new Resultado(titulo,periodo,nota,colunas,linhas,indicadores);
    }
    public byte[] pdf(Resultado r) throws JRException {
        Map<String,Object> p=new HashMap<>();
        p.put("TITULO",r.titulo()); p.put("PERIODO",r.periodo()); p.put("NOTA",r.observacao());
        p.put("RESUMO",String.join("   |   ",r.indicadores().stream().map(i->i.titulo()+": "+i.valor()).toList()));
        p.put("EMISSAO",LocalDateTime.now().format(HORA));
        for(int i=0;i<6;i++) p.put("H"+i,r.colunas().get(i));
        List<Map<String,?>> dados=new ArrayList<>();
        for(Linha l:r.linhas()) { Map<String,Object> row=new HashMap<>(); for(int i=0;i<6;i++) row.put("C"+i,l.celulas().get(i)); dados.add(row); }
        return JasperExportManager.exportReportToPdf(JasperFillManager.fillReport(modelo(),p,new JRMapCollectionDataSource(dados)));
    }
    private synchronized JasperReport modelo() throws JRException {
        if(modelo==null) {
            try(var stream=getClass().getResourceAsStream("/relatorios/gerencial.jrxml")) {
                if(stream==null) throw new JRException("Modelo gerencial não encontrado.");
                modelo=JasperCompileManager.compileReport(stream);
            } catch(java.io.IOException e) { throw new JRException(e); }
        }
        return modelo;
    }
    public String csv(Resultado r) {
        StringBuilder csv=new StringBuilder("\uFEFF"); csv.append(csvLinha(r.colunas()));
        for(Linha l:r.linhas()) csv.append(csvLinha(l.celulas())); return csv.toString();
    }
    private String csvLinha(List<String> valores) {
        return String.join(";",valores.stream().map(v->"\"" + (v.stripLeading().matches("(?s)^[=+@\\-].*") ? "'" : "") + v.replace("\"","\"\"") + "\"").toList())+"\r\n";
    }
    private static Linha linha(String... v) { return new Linha(Arrays.stream(v).map(RelatorioService::texto).toList()); }
    private static String texto(String v) { return v==null || v.isBlank() ? "-" : v; }
    private static String fornecedor(ContaAPagar c) { return c.getFornecedor()==null ? "Não informado" : texto(c.getFornecedor().getNome()); }
    private static boolean contem(String v,String termo) { return texto(v).toLowerCase(Locale.ROOT).contains(termo); }
    static boolean noPeriodo(LocalDate d,LocalDate i,LocalDate f) { return d==null ? i==null && f==null : (i==null || !d.isBefore(i)) && (f==null || !d.isAfter(f)); }
    private static BigDecimal decimal(Double v) { return v==null ? BigDecimal.ZERO : BigDecimal.valueOf(v); }
    private static String moeda(BigDecimal v) { return NumberFormat.getCurrencyInstance(Locale.forLanguageTag("pt-BR")).format(v); }
    private static String numero(BigDecimal v) { NumberFormat f=NumberFormat.getNumberInstance(Locale.forLanguageTag("pt-BR")); f.setMaximumFractionDigits(3); return f.format(v); }
    private static ResponseStatusException invalido(String msg) { return new ResponseStatusException(HttpStatus.BAD_REQUEST,msg); }
}
