package com.integrador.api.pizza.service;

import com.integrador.api.pizza.dto.MovimentoEstoqueCadastroDTO;
import com.integrador.api.pizza.model.*;
import com.integrador.api.pizza.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class MovimentoEstoqueService {
    private final MovimentoEstoqueRepository movimentos;
    private final ProdutoRepository produtos;
    private final InsumoRepository insumos;
    public MovimentoEstoqueService(MovimentoEstoqueRepository m,ProdutoRepository p,InsumoRepository i) { movimentos=m; produtos=p; insumos=i; }

    @Transactional
    public MovimentoEstoque cadastrarMovimento(MovimentoEstoqueCadastroDTO d) { return registrar(d,null,null); }

    @Transactional
    public MovimentoEstoque registrarSaidaProduto(Long id,double quantidade,String origem,Long referencia) {
        MovimentoEstoqueCadastroDTO d=new MovimentoEstoqueCadastroDTO();
        d.setProdutoId(id); d.setTipo("SAIDA"); d.setQuantidade(quantidade);
        return registrar(d,origem,referencia);
    }
    private MovimentoEstoque registrar(MovimentoEstoqueCadastroDTO d,String origem,Long referencia) {
        validar(d);
        Produto p=null; Insumo i=null;
        double delta=d.getTipo().equals("ENTRADA") ? d.getQuantidade() : -d.getQuantidade();
        if(d.getProdutoId()!=null) {
            p=produtos.buscarParaAtualizar(d.getProdutoId()).orElseThrow(()->erro("Produto não encontrado."));
            p.setQuantidade(saldo(p.getQuantidade(),delta,p.getNome())); produtos.save(p);
        } else {
            i=insumos.buscarParaAtualizar(d.getInsumoId()).orElseThrow(()->erro("Insumo não encontrado."));
            i.setQuantidade(saldo(i.getQuantidade(),delta,i.getNome())); insumos.save(i);
        }
        MovimentoEstoque m=new MovimentoEstoque(LocalDateTime.now(),d.getTipo(),d.getQuantidade(),p,i);
        m.setOrigem(origem); m.setReferencia(referencia); return movimentos.save(m);
    }
    private static void validar(MovimentoEstoqueCadastroDTO d) {
        if(d==null || d.getQuantidade()==null || !Double.isFinite(d.getQuantidade()) || d.getQuantidade()<=0) throw erro("Informe uma quantidade finita e maior que zero.");
        if(!"ENTRADA".equals(d.getTipo()) && !"SAIDA".equals(d.getTipo())) throw erro("Use ENTRADA ou SAIDA.");
        if((d.getProdutoId()==null)==(d.getInsumoId()==null)) throw erro("Informe exatamente um produto ou um insumo.");
    }
    private static double saldo(Double atual,double delta,String nome) {
        if(atual!=null && !Double.isFinite(atual)) throw erro("Saldo cadastrado inválido para "+nome+".");
        double novo=java.math.BigDecimal.valueOf(atual==null ? 0 : atual).add(java.math.BigDecimal.valueOf(delta)).doubleValue();
        if(!Double.isFinite(novo) || novo<0) throw erro("Estoque insuficiente para "+nome+". Saldo atual: "+(atual==null ? 0 : atual)+".");
        return novo;
    }
    public List<MovimentoEstoque> listarTodos() { return movimentos.findAll(); }
    public Optional<MovimentoEstoque> buscarPorId(Long id) { return movimentos.findById(id); }

    @Transactional
    public MovimentoEstoque atualizarMovimento(Long id,MovimentoEstoqueCadastroDTO d) {
        validar(d);
        MovimentoEstoque m=movimentos.buscarParaAtualizar(id).orElseThrow(()->erro("Movimento não encontrado."));
        editavel(m);
        if(!Objects.equals(d.getProdutoId(),m.getProduto()==null ? null : m.getProduto().getId()) ||
           !Objects.equals(d.getInsumoId(),m.getInsumo()==null ? null : m.getInsumo().getId())) throw erro("Não é possível trocar o item de um movimento. Registre outro lançamento.");
        double antigo=m.getTipo().equals("ENTRADA") ? m.getQuantidade() : -m.getQuantidade();
        double novo=d.getTipo().equals("ENTRADA") ? d.getQuantidade() : -d.getQuantidade();
        ajustar(m,java.math.BigDecimal.valueOf(novo).subtract(java.math.BigDecimal.valueOf(antigo)).doubleValue());
        m.setTipo(d.getTipo()); m.setQuantidade(d.getQuantidade()); return movimentos.save(m);
    }
    @Transactional
    public void deletarMovimento(Long id) {
        MovimentoEstoque m=movimentos.buscarParaAtualizar(id).orElseThrow(()->erro("Movimento não encontrado."));
        editavel(m); ajustar(m,m.getTipo().equals("ENTRADA") ? -m.getQuantidade() : m.getQuantidade()); movimentos.delete(m);
    }
    private void ajustar(MovimentoEstoque m,double delta) {
        if(m.getProduto()!=null) {
            Produto p=produtos.buscarParaAtualizar(m.getProduto().getId()).orElseThrow(()->erro("Produto não encontrado."));
            p.setQuantidade(saldo(p.getQuantidade(),delta,p.getNome())); produtos.save(p);
        } else if(m.getInsumo()!=null) {
            Insumo i=insumos.buscarParaAtualizar(m.getInsumo().getId()).orElseThrow(()->erro("Insumo não encontrado."));
            i.setQuantidade(saldo(i.getQuantidade(),delta,i.getNome())); insumos.save(i);
        } else throw erro("Movimento antigo sem item associado: correção automática não é segura.");
    }
    private static void editavel(MovimentoEstoque m) {
        if(m.getOrigem()!=null) throw erro("Movimento automático de venda não pode ser alterado ou excluído isoladamente.");
        if(!"ENTRADA".equals(m.getTipo()) && !"SAIDA".equals(m.getTipo())) throw erro("Movimento antigo com tipo desconhecido.");
    }
    private static ResponseStatusException erro(String msg) { return new ResponseStatusException(HttpStatus.CONFLICT,msg); }
}
