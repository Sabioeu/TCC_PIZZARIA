package com.integrador.api.pizza.repository;
import com.integrador.api.pizza.domain.Branch;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface BranchRepository extends JpaRepository<Branch, Long> { List<Branch> findAllByActiveTrueOrderByNameAsc(); }
