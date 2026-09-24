// mobile/src/components/DriverEarningsModal.tsx
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
import { X, DollarSign, ArrowUpRight, TrendingUp, RefreshCw, Landmark, CheckCircle2 } from 'lucide-react-native';
import { walletApi } from '../api/client';
import type { DriverEarningsSummary } from '../types';

interface DriverEarningsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const DriverEarningsModal: React.FC<DriverEarningsModalProps> = ({ visible, onClose }) => {
  const [data, setData] = useState<DriverEarningsSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [withdrawModalVisible, setWithdrawModalVisible] = useState<boolean>(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [upiId, setUpiId] = useState<string>('');
  const [isProcessingWithdraw, setIsProcessingWithdraw] = useState<boolean>(false);

  const fetchEarnings = async () => {
    setIsLoading(true);
    try {
      const summary = await walletApi.getDriverEarnings();
      setData(summary);
    } catch (err) {
      console.warn('Failed to load driver earnings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchEarnings();
    }
  }, [visible]);

  const handleWithdraw = async () => {
    const val = parseFloat(withdrawAmount);
    if (isNaN(val) || val <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid withdrawal amount.');
      return;
    }

    if (!data || val > data.walletBalance) {
      Alert.alert('Insufficient Balance', 'You cannot withdraw more than your available wallet balance.');
      return;
    }

    if (!upiId.trim()) {
      Alert.alert('Missing UPI / Account', 'Please provide a valid UPI ID (e.g. name@okhdfcbank).');
      return;
    }

    setIsProcessingWithdraw(true);
    try {
      const res = await walletApi.driverWithdraw(val, upiId.trim());
      Alert.alert('Payout Initiated! 💸', `₹${val} has been dispatched to ${upiId.trim()}.`);
      setWithdrawModalVisible(false);
      setWithdrawAmount('');
      fetchEarnings();
    } catch (err: any) {
      Alert.alert('Withdrawal Error', err.response?.data?.message || 'Could not process payout.');
    } finally {
      setIsProcessingWithdraw(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <SafeAreaView style={styles.backdrop}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <TrendingUp size={20} color="#38bdf8" />
              <Text style={styles.headerTitle}>Driver Earnings & Payouts</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {isLoading && !data ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#38bdf8" />
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              {/* Primary Balance & Payout Card */}
              <View style={styles.balanceCard}>
                <View>
                  <Text style={styles.balanceLabel}>AVAILABLE FOR PAYOUT</Text>
                  <Text style={styles.balanceValue}>₹{(data?.walletBalance || 0).toFixed(2)}</Text>
                </View>

                <TouchableOpacity
                  style={styles.withdrawBtn}
                  onPress={() => {
                    setWithdrawAmount((data?.walletBalance || 0).toString());
                    setWithdrawModalVisible(true);
                  }}
                  disabled={(data?.walletBalance || 0) <= 0}
                >
                  <Landmark size={14} color="#020617" />
                  <Text style={styles.withdrawBtnText}>Withdraw</Text>
                </TouchableOpacity>
              </View>

              {/* Today's KPI Metrics */}
              <View style={styles.kpiRow}>
                <View style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>TODAY'S NET</Text>
                  <Text style={[styles.kpiValue, { color: '#10b981' }]}>
                    ₹{(data?.todayNetEarnings || 0).toFixed(2)}
                  </Text>
                  <Text style={styles.kpiSub}>80% take-home</Text>
                </View>

                <View style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>TODAY'S RIDES</Text>
                  <Text style={[styles.kpiValue, { color: '#38bdf8' }]}>
                    {data?.todayRidesCount || 0}
                  </Text>
                  <Text style={styles.kpiSub}>Trips completed</Text>
                </View>

                <View style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>PLATFORM CUT</Text>
                  <Text style={[styles.kpiValue, { color: '#f59e0b' }]}>
                    ₹{(data?.todayPlatformFee || 0).toFixed(2)}
                  </Text>
                  <Text style={styles.kpiSub}>20% RideFlow fee</Text>
                </View>
              </View>

              {/* Recent Statements List */}
              <View style={styles.historySection}>
                <View style={styles.historyHeader}>
                  <Text style={styles.sectionTitle}>EARNINGS & PAYOUT HISTORY</Text>
                  <TouchableOpacity onPress={fetchEarnings} disabled={isLoading}>
                    <RefreshCw size={14} color="#64748b" />
                  </TouchableOpacity>
                </View>

                <FlatList
                  data={data?.recentTransactions || []}
                  keyExtractor={(item) => item.id.toString()}
                  contentContainerStyle={styles.txList}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>No trips or earnings recorded yet.</Text>
                  }
                  renderItem={({ item }) => {
                    const isEarning = item.amount > 0;
                    return (
                      <View style={styles.txRow}>
                        <View style={styles.txLeft}>
                          <View
                            style={[
                              styles.txIcon,
                              isEarning ? styles.txIconCredit : styles.txIconDebit,
                            ]}
                          >
                            <DollarSign size={16} color={isEarning ? '#10b981' : '#f43f5e'} />
                          </View>
                          <View style={styles.txInfo}>
                            <Text style={styles.txDesc} numberOfLines={1}>
                              {item.description}
                            </Text>
                            <Text style={styles.txDate}>{item.createdAt?.split('T')[0]}</Text>
                          </View>
                        </View>
                        <Text
                          style={[
                            styles.txAmount,
                            isEarning ? styles.txAmountCredit : styles.txAmountDebit,
                          ]}
                        >
                          {isEarning ? '+' : ''}₹{Math.abs(item.amount).toFixed(2)}
                        </Text>
                      </View>
                    );
                  }}
                />
              </View>
            </View>
          )}

          {/* Sub-Modal: Withdraw to UPI / Bank */}
          <Modal visible={withdrawModalVisible} animationType="fade" transparent>
            <View style={styles.subModalBackdrop}>
              <View style={styles.subModalCard}>
                <View style={styles.subModalHeader}>
                  <Text style={styles.subModalTitle}>Instant Bank / UPI Payout</Text>
                  <TouchableOpacity onPress={() => setWithdrawModalVisible(false)}>
                    <X size={18} color="#94a3b8" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.subModalInputLabel}>WITHDRAWAL AMOUNT (₹)</Text>
                <TextInput
                  style={styles.subModalInput}
                  keyboardType="numeric"
                  value={withdrawAmount}
                  onChangeText={setWithdrawAmount}
                  placeholder="e.g. 500"
                  placeholderTextColor="#64748b"
                />

                <Text style={styles.subModalInputLabel}>UPI ID OR BANK VPA</Text>
                <TextInput
                  style={styles.subModalInput}
                  value={upiId}
                  onChangeText={setUpiId}
                  placeholder="e.g. driver@okhdfcbank"
                  placeholderTextColor="#64748b"
                  autoCapitalize="none"
                />

                <TouchableOpacity
                  style={[styles.confirmPayoutBtn, isProcessingWithdraw && { opacity: 0.6 }]}
                  onPress={handleWithdraw}
                  disabled={isProcessingWithdraw}
                >
                  {isProcessingWithdraw ? (
                    <ActivityIndicator color="#020617" />
                  ) : (
                    <>
                      <CheckCircle2 size={16} color="#020617" strokeWidth={2.5} />
                      <Text style={styles.confirmPayoutBtnText}>Confirm Instant Payout</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    justifyContent: 'flex-end',
  },
  container: {
    height: '84%',
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceCard: {
    backgroundColor: '#0369a1',
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  balanceLabel: {
    color: '#bae6fd',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  balanceValue: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '800',
    marginTop: 2,
  },
  withdrawBtn: {
    backgroundColor: '#38bdf8',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  withdrawBtnText: {
    color: '#020617',
    fontSize: 13,
    fontWeight: '700',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  kpiLabel: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  kpiSub: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 2,
  },
  historySection: {
    flex: 1,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  txList: {
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
  subModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    justifyContent: 'center',
    padding: 24,
  },
  subModalCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 20,
  },
  subModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  subModalTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  subModalInputLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 8,
  },
  subModalInput: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  confirmPayoutBtn: {
    backgroundColor: '#38bdf8',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  confirmPayoutBtnText: {
    color: '#020617',
    fontSize: 14,
    fontWeight: '700',
  },
});

