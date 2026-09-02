package com.integrador.api.pizza.repository;
import com.integrador.api.pizza.domain.AuditEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface AuditEventRepository extends JpaRepository<AuditEvent, Long> { List<AuditEvent> findTop200ByBranchIdOrderByCreatedAtDesc(Long branchId); }
