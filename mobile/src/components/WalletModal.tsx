// mobile/src/components/WalletModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, CreditCard, ArrowDownRight, ArrowUpRight, Plus, RefreshCw, ShieldCheck } from 'lucide-react-native';
import { walletApi } from '../api/client';
import type { WalletTransaction } from '../types';

interface WalletModalProps {
  visible: boolean;
  onClose: () => void;
  onBalanceUpdated?: (newBalance: number) => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({
  visible,
  onClose,
  onBalanceUpdated,
}) => {
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isToppingUp, setIsToppingUp] = useState<boolean>(false);
  const [topupAmount, setTopupAmount] = useState<string>('500');

  const presetAmounts = ['100', '250', '500', '1000'];

  const fetchWalletData = async () => {
    setIsLoading(true);
    try {
      const [walletRes, txRes] = await Promise.all([
        walletApi.getBalance(),
        walletApi.getTransactions(),
      ]);
      setBalance(walletRes.balance || 0);
      setTransactions(txRes || []);
      if (onBalanceUpdated) onBalanceUpdated(walletRes.balance || 0);
    } catch (err) {
      console.warn('Failed to load wallet data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchWalletData();
    }
  }, [visible]);

  const handleTopup = async () => {
    const val = parseFloat(topupAmount);
    if (isNaN(val) || val <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid top-up amount.');
      return;
    }

    setIsToppingUp(true);
    try {
      const res = await walletApi.topup(val, 'Simulated UPI');
      setBalance(res.balance);
      if (onBalanceUpdated) onBalanceUpdated(res.balance);
      Alert.alert('Top-up Successful! 🎉', `₹${val} has been added to your RideFlow Wallet.`);
      fetchWalletData();
    } catch (err: any) {
      Alert.alert('Top-up Failed', err.response?.data?.message || 'Could not process top-up.');
    } finally {
      setIsToppingUp(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <SafeAreaView style={styles.backdrop}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <CreditCard size={20} color="#10b981" />
              <Text style={styles.headerTitle}>RideFlow Wallet</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Balance Card */}
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text>
            <Text style={styles.balanceValue}>₹{(balance ?? 0).toFixed(2)}</Text>
            <View style={styles.badgeRow}>
              <ShieldCheck size={14} color="#10b981" />
              <Text style={styles.badgeText}>Instant 1-tap ride checkout enabled</Text>
            </View>
          </View>

          {/* Top-up Section */}
          <View style={styles.topupCard}>
            <Text style={styles.sectionTitle}>ADD MONEY TO WALLET</Text>
            <View style={styles.presetRow}>
              {presetAmounts.map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={[
                    styles.presetChip,
                    topupAmount === amt && styles.presetChipActive,
                  ]}
                  onPress={() => setTopupAmount(amt)}
                >
                  <Text
                    style={[
                      styles.presetChipText,
                      topupAmount === amt && styles.presetChipTextActive,
                    ]}
                  >
                    +₹{amt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.inputRow}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.amountInput}
                keyboardType="numeric"
                value={topupAmount}
                onChangeText={setTopupAmount}
                placeholder="Amount"
                placeholderTextColor="#64748b"
              />
              <TouchableOpacity
                style={[styles.topupBtn, isToppingUp && styles.topupBtnDisabled]}
                onPress={handleTopup}
                disabled={isToppingUp}
              >
                {isToppingUp ? (
                  <ActivityIndicator size="small" color="#020617" />
                ) : (
                  <>
                    <Plus size={16} color="#020617" strokeWidth={3} />
                    <Text style={styles.topupBtnText}>Add Money</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Transaction Statement Ledger */}
          <View style={styles.historySection}>
            <View style={styles.historyHeader}>
              <Text style={styles.sectionTitle}>TRANSACTION STATEMENTS</Text>
              <TouchableOpacity onPress={fetchWalletData} disabled={isLoading}>
                <RefreshCw size={14} color="#64748b" />
              </TouchableOpacity>
            </View>

            {isLoading && transactions.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#10b981" />
              </View>
            ) : (
              <FlatList
                data={transactions}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.txList}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No wallet transactions yet.</Text>
                }
                renderItem={({ item }) => {
                  const isCredit = item.amount > 0;
                  return (
                    <View style={styles.txRow}>
                      <View style={styles.txLeft}>
                        <View
                          style={[
                            styles.txIcon,
                            isCredit ? styles.txIconCredit : styles.txIconDebit,
                          ]}
                        >
                          {isCredit ? (
                            <ArrowDownRight size={16} color="#10b981" />
                          ) : (
                            <ArrowUpRight size={16} color="#f43f5e" />
                          )}
                        </View>
                        <View style={styles.txInfo}>
                          <Text style={styles.txDesc} numberOfLines={1}>
                            {item.description}
                          </Text>
                          <Text style={styles.txDate}>{formatDate(item.createdAt)}</Text>
                        </View>
                      </View>
                      <Text
                        style={[
                          styles.txAmount,
                          isCredit ? styles.txAmountCredit : styles.txAmountDebit,
                        ]}
                      >
                        {isCredit ? '+' : ''}₹{Math.abs(item.amount).toFixed(2)}
                      </Text>
                    </View>
                  );
                }}
              />
            )}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.8)',
    justifyContent: 'flex-end',
  },
  container: {
    height: '82%',
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceCard: {
    backgroundColor: '#022c22',
    borderWidth: 1,
    borderColor: '#065f46',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  balanceLabel: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  balanceValue: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '800',
    marginTop: 4,
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeText: {
    color: '#a7f3d0',
    fontSize: 12,
    fontWeight: '500',
  },
  topupCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  presetChip: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  presetChipActive: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
  },
  presetChipText: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '600',
  },
  presetChipTextActive: {
    color: '#34d399',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  currencySymbol: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 4,
  },
  amountInput: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: '#334155',
  },
  topupBtn: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  topupBtnDisabled: {
    opacity: 0.5,
  },
  topupBtnText: {
    color: '#020617',
    fontSize: 13,
    fontWeight: '700',
  },
  historySection: {
    flex: 1,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  loadingContainer: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  txList: {
    paddingTop: 8,
    paddingBottom: 20,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 30,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  txIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txIconCredit: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  txIconDebit: {
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
  },
  txInfo: {
    flex: 1,
  },
  txDesc: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
  },
  txDate: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  txAmountCredit: {
    color: '#10b981',
  },
  txAmountDebit: {
    color: '#f43f5e',
  },
});

