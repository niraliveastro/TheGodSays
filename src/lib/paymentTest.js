/**
 * Payment Integration Testing Utilities
 * This file contains utilities to test the payment system integration
 */

import { WalletService } from './wallet'
import { PricingService } from './pricing'
import { BillingService } from './billing'

export class PaymentTestUtils {
  /**
   * Test wallet operations
   */
  static async testWalletOperations(userId) {
    console.log('🧪 Testing wallet operations...')

    try {
      // Test wallet creation
      console.log('Creating wallet...')
      const wallet = await WalletService.createWallet(userId)
      console.log('✅ Wallet created:', wallet)

      // Test adding money
      console.log('Adding money to wallet...')
      const addResult = await WalletService.addMoney(userId, 100, 'test-transaction-1', 'Test recharge')
      console.log('✅ Money added:', addResult)

      // Test wallet balance
      const balance = await WalletService.getWallet(userId)
      console.log('✅ Current balance:', balance)

      // Test deducting money
      console.log('Deducting money from wallet...')
      const deductResult = await WalletService.deductMoney(userId, 50, 'test-transaction-2', 'Test deduction')
      console.log('✅ Money deducted:', deductResult)

      return { success: true, results: { wallet, addResult, balance, deductResult } }
    } catch (error) {
      console.error('❌ Wallet test failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Test pricing operations
   */
  static async testPricingOperations(astrologerId) {
    console.log('🧪 Testing pricing operations...')

    try {
      // Test setting pricing
      console.log('Setting astrologer pricing...')
      const pricingResult = await PricingService.setPricing(astrologerId, {
        pricingType: 'per_minute',
        basePrice: 50,
        discountPercent: 10,
        callDurationMins: 30
      })
      console.log('✅ Pricing set:', pricingResult)

      // Test getting pricing
      console.log('Getting astrologer pricing...')
      const pricing = await PricingService.getPricing(astrologerId)
      console.log('✅ Pricing retrieved:', pricing)

      // Test price calculation
      console.log('Testing price calculation...')
      const costCalculation = PricingService.calculateCallCost(pricing, 10)
      console.log('✅ Cost calculation:', costCalculation)

      return { success: true, results: { pricingResult, pricing, costCalculation } }
    } catch (error) {
      console.error('❌ Pricing test failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Test billing operations
   */
  static async testBillingOperations(userId, astrologerId) {
    console.log('🧪 Testing billing operations...')

    try {
      // Test balance validation
      console.log('Validating balance for call...')
      const validation = await BillingService.validateBalanceForCall(userId, astrologerId, 5)
      console.log('✅ Balance validation:', validation)

      if (!validation.hasBalance) {
        console.log('⚠️ Insufficient balance, adding money first...')
        await WalletService.addMoney(userId, 200, 'test-recharge-billing', 'Test recharge for billing')
      }

      // Test call billing initialization
      console.log('Initializing call billing...')
      const initResult = await BillingService.initializeCallBilling('test-call-id', userId, astrologerId)
      console.log('✅ Call billing initialized:', initResult)

      // Test duration update
      console.log('Updating call duration...')
      const durationResult = await BillingService.updateCallDuration('test-call-id', 10)
      console.log('✅ Duration updated:', durationResult)

      // Test call finalization
      console.log('Finalizing call billing...')
      const finalizeResult = await BillingService.finalizeCallBilling('test-call-id', 10)
      console.log('✅ Call billing finalized:', finalizeResult)

      return { success: true, results: { validation, initResult, durationResult, finalizeResult } }
    } catch (error) {
      console.error('❌ Billing test failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Run all payment system tests
   */
  static async runAllTests(userId, astrologerId) {
    console.log('🚀 Starting payment system tests...\n')

    const results = {
      wallet: await this.testWalletOperations(userId),
      pricing: await this.testPricingOperations(astrologerId),
      billing: await this.testBillingOperations(userId, astrologerId)
    }

    const allPassed = Object.values(results).every(r => r.success)

    console.log('\n📊 Test Results Summary:')
    console.log('Wallet tests:', results.wallet.success ? '✅ PASSED' : '❌ FAILED')
    console.log('Pricing tests:', results.pricing.success ? '✅ PASSED' : '❌ FAILED')
    console.log('Billing tests:', results.billing.success ? '✅ PASSED' : '❌ FAILED')
    console.log('Overall:', allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED')

    return { success: allPassed, results }
  }
}