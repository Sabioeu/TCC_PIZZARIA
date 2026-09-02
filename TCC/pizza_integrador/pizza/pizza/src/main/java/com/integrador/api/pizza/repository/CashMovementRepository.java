package com.integrador.api.pizza.repository;
import com.integrador.api.pizza.domain.CashMovement;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface CashMovementRepository extends JpaRepository<CashMovement, Long> { List<CashMovement> findAllByCashSessionIdOrderByCreatedAtDesc(Long cashSessionId); }
