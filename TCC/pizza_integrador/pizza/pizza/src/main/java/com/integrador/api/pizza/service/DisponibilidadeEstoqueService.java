package com.integrador.api.pizza.service;

import com.integrador.api.pizza.model.*;
import com.integrador.api.pizza.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

/** Reserva lógica nas comandas abertas; a baixa física ocorre apenas no faturamento. */
@Service
public class DisponibilidadeEstoqueService {
    private final ProdutoRepository produtos;
    private final ItemComandaRepository itens;
    private final InsumoRepository insumos;
    private final ComponenteFichaTecnicaRepository fichas;
    private final ConsumoItemComandaRepository consumos;
    @jakarta.persistence.PersistenceContext private jakarta.persistence.EntityManager entityManager;
    public DisponibilidadeEstoqueService(ProdutoRepository p, ItemComandaRepository it, InsumoRepository i, ComponenteFichaTecnicaRepository f, ConsumoItemComandaRepository c) {
        produtos=p; itens=it; insumos=i; fichas=f; consumos=c;
    }
    public record Ingrediente(Long insumoId,String nome,String unidade,BigDecimal quantidadePorUnidade,double saldo,BigDecimal reservado,BigDecimal disponivel) {}
    public record Disponibilidade(Long produtoId,double estoque,long reservado,double disponivel,String modoEstoque,List<Ingrediente> ingredientes,List<Ingrediente> limitantes) {}

    @Transactional(readOnly=true)
    public List<Disponibilidade> listar() {
        return produtos.findAll().stream().map(p -> {
            long reservado=itens.quantidadeComprometida(p.getId(),null);
            if (!p.getPorIngredientes()) {
                double estoque=saldoProduto(p).doubleValue();
                return new Disponibilidade(p.getId(),estoque,reservado,Math.max(0,estoque-reservado),"PRODUTO",List.of(),List.of());
            }
            var ingredientes=fichas.findByProdutoIdOrderByInsumoId(p.getId()).stream().map(c -> {
                var i=c.getInsumo(); var saldo=saldoInsumo(i); var reserva=reservadoInsumo(i.getId(),null);
                return new Ingrediente(i.getId(),i.getNome(),i.getUnidade(),c.getQuantidadePorUnidade(),saldo.doubleValue(),reserva,saldo.subtract(reserva).max(BigDecimal.ZERO));
            }).toList();
            double estoque=capacidade(ingredientes,false);
            double disponivel=capacidade(ingredientes,true);
            var limitantes=ingredientes.stream().filter(i -> capacidadeIngrediente(i,true)==disponivel).toList();
            return new Disponibilidade(p.getId(),estoque,reservado,disponivel,"INGREDIENTES",ingredientes,limitantes);
        }).toList();
    }
    private static double capacidade(List<Ingrediente> ingredientes,boolean livre) {
        return ingredientes.stream().mapToDouble(i -> capacidadeIngrediente(i,livre)).min().orElse(0);
    }
    private static double capacidadeIngrediente(Ingrediente i,boolean livre) {
        return (livre ? i.disponivel() : BigDecimal.valueOf(i.saldo())).divide(i.quantidadePorUnidade(),0,RoundingMode.FLOOR).doubleValue();
    }

    /** Ordem global: mesa/comanda (no chamador), produtos por ID, insumos por ID. */
    @Transactional
    public Map<Long,Produto> validarCarrinho(Map<Long,Double> quantidades) {
        var validados=new TreeMap<Long,Produto>();
        var demanda=new TreeMap<Long,BigDecimal>();
        new TreeMap<>(quantidades).forEach((id,qtd) -> {
            validarQuantidade(qtd);
            var p=buscarProdutoParaAtualizar(id);
            validados.put(id,p);
            if(p.getPorIngredientes()) {
                var receita=fichas.findByProdutoIdOrderByInsumoId(id);
                if(receita.isEmpty()) throw conflito("Configure a ficha técnica de "+p.getNome()+" antes de vender.");
                receita.forEach(c -> demanda.merge(c.getInsumo().getId(),c.getQuantidadePorUnidade().multiply(BigDecimal.valueOf(qtd)),BigDecimal::add));
            } else {
                var livre=saldoProduto(p).subtract(BigDecimal.valueOf(itens.quantidadeUnidadesComprometida(id,null)));
                if(BigDecimal.valueOf(qtd).compareTo(livre)>0) throw insuficiente(p,livre.max(BigDecimal.ZERO));
            }
        });
        validarDemandaInsumos(demanda);
        return validados;
    }
    @Transactional
    public Produto validarInclusao(Long produtoId,double quantidade) {
        return validarCarrinho(Map.of(produtoId,quantidade)).get(produtoId);
    }
    public void capturarFicha(ItemComanda item) {
        item.setPorIngredientes(item.getProduto().getPorIngredientes());
        if(!Boolean.TRUE.equals(item.getPorIngredientes())) return;
        var receita=fichas.findByProdutoIdOrderByInsumoId(item.getProduto().getId());
        if(receita.isEmpty()) throw conflito("Produto sem ingredientes configurados.");
        for(var c:receita) {
            var snapshot=new ConsumoItemComanda();
            snapshot.setItem(item); snapshot.setInsumo(c.getInsumo()); snapshot.setQuantidadePorUnidade(c.getQuantidadePorUnidade());
            snapshot.setNomeInsumo(c.getInsumo().getNome()); snapshot.setUnidadeInsumo(c.getInsumo().getUnidade());
            item.getIngredientes().add(snapshot);
        }
    }
    @Transactional
    public void validarAumento(ItemComanda item,int quantidadeAdicional) {
        validarQuantidade((double)quantidadeAdicional);
        var p=buscarProdutoParaAtualizar(item.getProduto().getId());
        if(!Boolean.TRUE.equals(item.getPorIngredientes())) {
            var livre=saldoProduto(p).subtract(BigDecimal.valueOf(itens.quantidadeUnidadesComprometida(p.getId(),null)));
            if(BigDecimal.valueOf(quantidadeAdicional).compareTo(livre)>0) throw insuficiente(p,livre.max(BigDecimal.ZERO));
            return;
        }
        var demanda=new TreeMap<Long,BigDecimal>();
        item.getIngredientes().forEach(c -> demanda.merge(c.getInsumo().getId(),c.getQuantidadePorUnidade().multiply(BigDecimal.valueOf(quantidadeAdicional)),BigDecimal::add));
        if(demanda.isEmpty()) throw conflito("Item sem snapshot de ingredientes; não é seguro alterar.");
        validarDemandaInsumos(demanda);
    }
    private void validarDemandaInsumos(Map<Long,BigDecimal> demanda) {
        for(var d:new TreeMap<>(demanda).entrySet()) {
            var i=buscarInsumoParaAtualizar(d.getKey());
            var livre=saldoInsumo(i).subtract(reservadoInsumo(i.getId(),null));
            if(d.getValue().compareTo(livre)>0) throw conflito("Ingredientes insuficientes para o conjunto do pedido: "+i.getNome()+". Disponível: "+livre.max(BigDecimal.ZERO).stripTrailingZeros().toPlainString()+" "+i.getUnidade()+" (descontados os atendimentos abertos).");
        }
    }
    public void bloquearItens(List<ItemComanda> lista) {
        lista.stream().map(i -> i.getProduto().getId()).distinct().sorted().forEach(this::buscarProdutoParaAtualizar);
        lista.stream().flatMap(i -> i.getIngredientes().stream()).map(c -> c.getInsumo().getId()).distinct().sorted().forEach(this::buscarInsumoParaAtualizar);
    }
    public Produto buscarProdutoParaAtualizar(Long id) {
        var p=produtos.buscarParaAtualizar(id).orElseThrow(() -> new IllegalArgumentException("Produto não encontrado."));
        // A entidade pode ter sido carregada antes de esperar pelo lock. Releia o saldo confirmado.
        entityManager.refresh(p);
        return p;
    }
    public Insumo buscarInsumoParaAtualizar(Long id) {
        var i=insumos.buscarParaAtualizar(id).orElseThrow(() -> new IllegalArgumentException("Insumo não encontrado."));
        entityManager.refresh(i);
        return i;
    }
    public Map<Long,BigDecimal> consumoInsumos(List<ItemComanda> lista) {
        var demanda=new TreeMap<Long,BigDecimal>();
        for(var item:lista) {
            if(!Boolean.TRUE.equals(item.getPorIngredientes())) continue;
            if(item.getIngredientes().isEmpty()) throw conflito("Item sem snapshot de ingredientes; não é seguro faturar.");
            item.getIngredientes().forEach(c -> demanda.merge(c.getInsumo().getId(),c.getQuantidadePorUnidade().multiply(BigDecimal.valueOf(item.getQuantidade())),BigDecimal::add));
        }
        return demanda;
    }
    public BigDecimal reservadoInsumo(Long id,Long comandaIgnorada) {
        return consumos.reservas(id,comandaIgnorada).stream()
                .map(c -> c.getQuantidadePorUnidade().multiply(BigDecimal.valueOf(c.getItem().getQuantidade())))
                .reduce(BigDecimal.ZERO,BigDecimal::add);
    }
    public void preservarReservas(Produto produto,double novoSaldo,Long comandaFaturada) {
        if(BigDecimal.valueOf(novoSaldo).compareTo(BigDecimal.valueOf(itens.quantidadeUnidadesComprometida(produto.getId(),comandaFaturada)))<0)
            throw conflito("A saída de "+produto.getNome()+" consumiria estoque reservado para atendimentos abertos. Reduza/cancele os itens reservados antes de ajustar o saldo.");
    }
    public void preservarReservasInsumo(Insumo insumo,double novoSaldo,Long comandaFaturada) {
        if(BigDecimal.valueOf(novoSaldo).compareTo(reservadoInsumo(insumo.getId(),comandaFaturada))<0)
            throw conflito("A saída de "+insumo.getNome()+" consumiria ingredientes reservados para atendimentos abertos. Reduza/cancele os itens reservados antes de ajustar o saldo.");
    }
    static BigDecimal saldoInsumo(Insumo i) { return saldo(i.getQuantidade(),i.getNome()); }
    private static BigDecimal saldoProduto(Produto p) { return saldo(p.getQuantidade(),p.getNome()); }
    private static BigDecimal saldo(Double qtd,String nome) {
        if(qtd==null) return BigDecimal.ZERO;
        if(!Double.isFinite(qtd) || qtd<0) throw new IllegalArgumentException("Estoque inválido para "+nome+".");
        return BigDecimal.valueOf(qtd);
    }
    private static void validarQuantidade(Double qtd) {
        if(qtd==null || !Double.isFinite(qtd) || qtd<=0) throw new IllegalArgumentException("Informe uma quantidade finita e maior que zero.");
    }
    private static ResponseStatusException insuficiente(Produto p,BigDecimal disponivel) {
        return conflito("Estoque insuficiente para "+p.getNome()+". Disponível para novos pedidos: "+disponivel.stripTrailingZeros().toPlainString()+" (descontados os atendimentos abertos).");
    }
    private static ResponseStatusException conflito(String msg) { return new ResponseStatusException(HttpStatus.CONFLICT,msg); }
}
