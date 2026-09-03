package com.integrador.api.pizza.repository;

import com.integrador.api.pizza.domain.CustomerFeedback;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface CustomerFeedbackRepository extends JpaRepository<CustomerFeedback, Long> {
    List<CustomerFeedback> findTop200ByBranchIdOrderByCreatedAtDesc(Long branchId);
    Optional<CustomerFeedback> findByOrderId(Long orderId);
}
