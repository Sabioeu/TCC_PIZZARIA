package com.integrador.api.pizza.service;

import com.integrador.api.pizza.dto.FichaTecnicaDTO;
import com.integrador.api.pizza.model.*;
import com.integrador.api.pizza.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.util.*;

@Service
public class FichaTecnicaService {
    private final ProdutoRepository produtos;
    private final InsumoRepository insumos;
    private final ItemComandaRepository itens;
    private final ComponenteFichaTecnicaRepository componentes;
    private final DisponibilidadeEstoqueService disponibilidade;
    public FichaTecnicaService(ProdutoRepository p, InsumoRepository i, ItemComandaRepository it, ComponenteFichaTecnicaRepository c, DisponibilidadeEstoqueService d) {
        produtos=p; insumos=i; itens=it; componentes=c; disponibilidade=d;
    }
    public record Componente(Long insumoId, String nome, String unidade, BigDecimal quantidadePorUnidade, double saldo, BigDecimal reservado, BigDecimal disponivel) {}
    public record Ficha(Long produtoId, boolean porIngredientes, List<Componente> componentes) {}

    @Transactional(readOnly = true)
    public Ficha buscar(Long produtoId) {
        var produto=produtos.findById(produtoId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,"Produto não encontrado."));
        return resposta(produto);
    }

    @Transactional
    public Ficha salvar(Long produtoId, FichaTecnicaDTO dto) {
        validar(dto);
        var produto=produtos.buscarParaAtualizar(produtoId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,"Produto não encontrado."));
        if (itens.quantidadeComprometida(produtoId,null)>0) throw new ResponseStatusException(HttpStatus.CONFLICT,"Conclua ou cancele os atendimentos abertos deste produto antes de alterar a ficha técnica ou o modo de estoque.");
        var insumosValidados=new TreeMap<Long,Insumo>();
        dto.getComponentes().stream().map(FichaTecnicaDTO.Componente::getInsumoId).sorted().forEach(id -> insumosValidados.put(id,insumos.buscarParaAtualizar(id).orElseThrow(() -> new IllegalArgumentException("Insumo não encontrado: "+id))));
        componentes.deleteByProdutoId(produtoId);
        componentes.flush();
        for (var dado:dto.getComponentes()) {
            var c=new ComponenteFichaTecnica(); c.setProduto(produto); c.setInsumo(insumosValidados.get(dado.getInsumoId())); c.setQuantidadePorUnidade(dado.getQuantidadePorUnidade()); componentes.save(c);
        }
        produto.setPorIngredientes(dto.getPorIngredientes());
        produtos.save(produto);
        // O estoque físico antigo é preservado, nunca transformado em ingredientes.
        return resposta(produto);
    }
    private Ficha resposta(Produto produto) {
        return new Ficha(produto.getId(),produto.getPorIngredientes(),componentes.findByProdutoIdOrderByInsumoId(produto.getId()).stream().map(c -> {
            var i=c.getInsumo(); var reserva=disponibilidade.reservadoInsumo(i.getId(),null);
            var saldo=DisponibilidadeEstoqueService.saldoInsumo(i);
            return new Componente(i.getId(),i.getNome(),i.getUnidade(),c.getQuantidadePorUnidade(),saldo.doubleValue(),reserva,saldo.subtract(reserva).max(BigDecimal.ZERO));
        }).toList());
    }
    private static void validar(FichaTecnicaDTO dto) {
        if(dto==null || dto.getPorIngredientes()==null || dto.getComponentes()==null || dto.getComponentes().size()>100) throw new IllegalArgumentException("Informe o modo de estoque e os componentes da ficha técnica.");
        if(dto.getPorIngredientes() && dto.getComponentes().isEmpty()) throw new IllegalArgumentException("Adicione pelo menos um ingrediente para ativar a ficha técnica.");
        var ids=new HashSet<Long>();
        for(var c:dto.getComponentes()) {
            if(c==null || c.getInsumoId()==null || c.getInsumoId()<=0 || !ids.add(c.getInsumoId())) throw new IllegalArgumentException("Selecione insumos distintos na ficha técnica.");
            var qtd=c.getQuantidadePorUnidade();
            if(qtd==null || qtd.signum()<=0 || qtd.stripTrailingZeros().scale()>6 || qtd.compareTo(new BigDecimal("999999.999999"))>0) throw new IllegalArgumentException("Informe uma quantidade por unidade positiva, com até seis casas decimais.");
        }
    }
}
