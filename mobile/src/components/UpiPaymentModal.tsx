// mobile/src/components/UpiPaymentModal.tsx
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, QrCode, CheckCircle2, Copy, ShieldCheck } from 'lucide-react-native';

interface UpiPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  fareAmount: number;
  rideId: number;
  onPaymentSuccess?: () => void;
}

export const UpiPaymentModal: React.FC<UpiPaymentModalProps> = ({
  visible,
  onClose,
  fareAmount,
  rideId,
  onPaymentSuccess,
}) => {
  const [copied, setCopied] = useState(false);
  const upiId = 'rideflow.ops@icici';

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    Alert.alert('Copied!', `UPI ID ${upiId} copied to clipboard.`);
  };

  const handleSimulatePayment = () => {
    Alert.alert('Payment Verified! ✅', `₹${(fareAmount ?? 0).toFixed(2)} received via UPI. Thank you!`, [
      {
        text: 'Done',
        onPress: () => {
          if (onPaymentSuccess) onPaymentSuccess();
          onClose();
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <SafeAreaView style={styles.backdrop}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <QrCode size={20} color="#38bdf8" />
              <Text style={styles.headerTitle}>Instant UPI QR Payment</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Amount Badge */}
          <View style={styles.amountBox}>
            <Text style={styles.amountLabel}>AMOUNT PAYABLE</Text>
            <Text style={styles.amountValue}>₹{(fareAmount ?? 0).toFixed(2)}</Text>
            <Text style={styles.rideRef}>Ride #{rideId} Settlement</Text>
          </View>

          {/* Stylized QR Code Mock */}
          <View style={styles.qrContainer}>
            <View style={styles.qrPlaceholder}>
              <QrCode size={160} color="#020617" />
              <View style={styles.qrCenterBadge}>
                <Text style={styles.qrCenterText}>UPI</Text>
              </View>
            </View>
            <Text style={styles.scanHint}>Scan with any UPI App (GPay, PhonePe, Paytm)</Text>
          </View>

          {/* UPI ID Row */}
          <View style={styles.upiIdRow}>
            <View>
              <Text style={styles.upiLabel}>UPI ID / VPA</Text>
              <Text style={styles.upiText}>{upiId}</Text>
            </View>
            <TouchableOpacity style={styles.copyBtn} onPress={handleCopy}>
              <Copy size={14} color="#38bdf8" />
              <Text style={styles.copyText}>{copied ? 'Copied' : 'Copy'}</Text>
            </TouchableOpacity>
          </View>

          {/* Action Button */}
          <TouchableOpacity style={styles.verifyBtn} onPress={handleSimulatePayment}>
            <CheckCircle2 size={18} color="#020617" strokeWidth={2.5} />
            <Text style={styles.verifyBtnText}>Simulate Instant UPI Success</Text>
          </TouchableOpacity>

          <View style={styles.secureFooter}>
            <ShieldCheck size={12} color="#10b981" />
            <Text style={styles.secureText}>NPCI Unified Payments Interface 2.0</Text>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#0f172a',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 20,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountBox: {
    width: '100%',
    backgroundColor: '#0369a1',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  amountLabel: {
    color: '#bae6fd',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  amountValue: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 2,
  },
  rideRef: {
    color: '#e0f2fe',
    fontSize: 11,
    marginTop: 2,
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  qrPlaceholder: {
    width: 190,
    height: 190,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  qrCenterBadge: {
    position: 'absolute',
    backgroundColor: '#0284c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  qrCenterText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  scanHint: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 10,
    textAlign: 'center',
  },
  upiIdRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  upiLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
  },
  upiText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 1,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  copyText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '600',
  },
  verifyBtn: {
    width: '100%',
    backgroundColor: '#38bdf8',
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  verifyBtnText: {
    color: '#020617',
    fontSize: 14,
    fontWeight: '700',
  },
  secureFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  secureText: {
    color: '#64748b',
    fontSize: 11,
  },
});

