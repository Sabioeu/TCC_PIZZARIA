package com.integrador.api.pizza.repository;
import com.integrador.api.pizza.domain.CustomerMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface CustomerMessageRepository extends JpaRepository<CustomerMessage, Long> { List<CustomerMessage> findTop100ByBranchIdOrderByCreatedAtDesc(Long branchId); List<CustomerMessage> findAllByBranchIdAndCustomerId(Long branchId, Long customerId); }
