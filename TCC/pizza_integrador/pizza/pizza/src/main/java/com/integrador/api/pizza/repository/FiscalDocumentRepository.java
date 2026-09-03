package com.integrador.api.pizza.repository;
import com.integrador.api.pizza.domain.FiscalDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface FiscalDocumentRepository extends JpaRepository<FiscalDocument, Long> { List<FiscalDocument> findTop100ByBranchIdOrderByCreatedAtDesc(Long branchId); }
