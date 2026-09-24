package com.rideflow.backend.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.rideflow.backend.model.WalletTransaction;
import com.rideflow.backend.model.WalletTransactionType;

@Repository
public interface WalletTransactionRepository extends JpaRepository<WalletTransaction, Long> {
    List<WalletTransaction> findByWalletIdOrderByCreatedAtDesc(Long walletId);

    @Query("SELECT t FROM WalletTransaction t WHERE t.wallet.id = :walletId AND t.createdAt >= :since ORDER BY t.createdAt DESC")
    List<WalletTransaction> findByWalletIdSince(
            @Param("walletId") Long walletId,
            @Param("since") LocalDateTime since
    );

    @Query("SELECT COALESCE(SUM(t.amount), 0.0) FROM WalletTransaction t WHERE t.wallet.id = :walletId AND t.type = :type AND t.createdAt >= :since")
    Double sumAmountByWalletAndTypeSince(
            @Param("walletId") Long walletId,
            @Param("type") WalletTransactionType type,
            @Param("since") LocalDateTime since
    );
}

