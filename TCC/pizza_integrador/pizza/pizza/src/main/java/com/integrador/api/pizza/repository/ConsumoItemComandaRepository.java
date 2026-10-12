package com.integrador.api.pizza.repository;

import com.integrador.api.pizza.model.ConsumoItemComanda;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface ConsumoItemComandaRepository extends JpaRepository<ConsumoItemComanda, Long> {
    @Query("select c from ConsumoItemComanda c join fetch c.item i where c.insumo.id=:insumoId and i.comanda.status='ABERTA' and (:ignorada is null or i.comanda.id<>:ignorada)")
    List<ConsumoItemComanda> reservas(@Param("insumoId") Long insumoId, @Param("ignorada") Long ignorada);
}
