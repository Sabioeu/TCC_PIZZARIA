package com.integrador.api.pizza.repository;

import com.integrador.api.pizza.model.ItemComanda;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ItemComandaRepository extends JpaRepository<ItemComanda, Long> {
    // Exemplo: buscar todos os itens de uma comanda específica
    List<ItemComanda> findByComandaId(Long comandaId);
    @org.springframework.data.jpa.repository.Query("select coalesce(sum(i.quantidade),0) from ItemComanda i where i.produto.id=:produtoId and i.comanda.status='ABERTA' and (:ignorada is null or i.comanda.id<>:ignorada)")
    Long quantidadeComprometida(@org.springframework.data.repository.query.Param("produtoId") Long produtoId, @org.springframework.data.repository.query.Param("ignorada") Long ignorada);
    @org.springframework.data.jpa.repository.Query("select coalesce(sum(i.quantidade),0) from ItemComanda i where i.produto.id=:produtoId and (i.porIngredientes is null or i.porIngredientes=false) and i.comanda.status='ABERTA' and (:ignorada is null or i.comanda.id<>:ignorada)")
    Long quantidadeUnidadesComprometida(@org.springframework.data.repository.query.Param("produtoId") Long produtoId, @org.springframework.data.repository.query.Param("ignorada") Long ignorada);
}
