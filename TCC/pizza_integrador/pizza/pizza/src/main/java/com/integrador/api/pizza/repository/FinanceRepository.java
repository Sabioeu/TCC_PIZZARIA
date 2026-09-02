package com.integrador.api.pizza.repository;
import com.integrador.api.pizza.domain.FinanceEntry;
import org.springframework.data.jpa.repository.JpaRepository;
public interface FinanceRepository extends JpaRepository<FinanceEntry, Long> { }
