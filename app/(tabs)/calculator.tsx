"use client"

import { Ionicons } from "@expo/vector-icons"
import DateTimePicker from "@react-native-community/datetimepicker"
import { LinearGradient } from "expo-linear-gradient"
import { useRef, useState } from "react"
import {
  Alert,
  Animated,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import CalculationHistory from "../../components/CalculationHistory"
import { useAuth } from "../../constants/AuthContext"
import type { CalculationData } from "../../constants/types"
import { CalculatorService } from "../../services/calculatorService"

const { width, height } = Dimensions.get("window")

type CalculatorTab = "simple" | "interest" | "bmi" | "length"

export default function CalculatorScreen() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<CalculatorTab>("simple")
  const [showInterestModal, setShowInterestModal] = useState(false)
  const [showBMIModal, setShowBMIModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const scaleAnim = useRef(new Animated.Value(1)).current

  // Simple calculator state
  const [display, setDisplay] = useState("0")
  const [previousValue, setPreviousValue] = useState<number | null>(null)
  const [operation, setOperation] = useState<string | null>(null)
  const [waitingForOperand, setWaitingForOperand] = useState(false)
  const [expression, setExpression] = useState("") // Track full expression
  const [hasComputed, setHasComputed] = useState(false)
  const [isManualExpression, setIsManualExpression] = useState(false)
  const [previewResult, setPreviewResult] = useState<number | null>(null)

  // Interest calculator state
  const [interestForm, setInterestForm] = useState({
    name: "",
    amount: "",
    rate: "",
    fromDate: "",
    toDate: "",
  })

  // BMI calculator state
  const [bmiForm, setBmiForm] = useState({
    name: "",
    height: "",
    weight: "",
  })

  // Length converter state
  const lengthUnits = ["mm", "cm", "m", "km", "in", "ft", "yd", "mi"] as const
  type LengthUnit = typeof lengthUnits[number]
  const [unitA, setUnitA] = useState<LengthUnit>("m")
  const [unitB, setUnitB] = useState<LengthUnit>("ft")
  const [valueA, setValueA] = useState<string>("")
  const [valueB, setValueB] = useState<string>("")
  const [lastEdited, setLastEdited] = useState<"A" | "B">("A")
  const [showUnitPickerFor, setShowUnitPickerFor] = useState<null | "A" | "B">(null)

  const [interestResult, setInterestResult] = useState<any | null>(null)
  const [bmiResult, setBmiResult] = useState<any | null>(null)
  const [showBMISummary, setShowBMISummary] = useState(false)
  const [showInterestSummary, setShowInterestSummary] = useState(false)
  const [historyRefresh, setHistoryRefresh] = useState(0)

  const tabs = [
    { id: "simple", name: "Simple", icon: "calculator", gradient: ["#6366F1", "#8B5CF6"] },
    { id: "interest", name: "Interest", icon: "trending-up", gradient: ["#10B981", "#059669"] },
    { id: "bmi", name: "BMI", icon: "fitness", gradient: ["#F59E0B", "#D97706"] },
    { id: "length", name: "Length", icon: "swap-horizontal", gradient: ["#06B6D4", "#0EA5E9"] },
  ] as const

  const animateButton = () => {
    Vibration.vibrate(50)
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start()
  }

  // Live preview helper: evaluate expression without trailing operator or '= result'
  const updatePreviewFrom = (expr: string) => {
    try {
      if (!expr) {
        setPreviewResult(null)
        return
      }
      const noEquals = expr.includes("=") ? expr.split("=")[0].trim() : expr.trim()
      const trimmed = noEquals.replace(/[+\-*/]\s*$/,'').trim()
      if (!trimmed) {
        setPreviewResult(null)
        return
      }
      const res = CalculatorService.evaluateExpression(trimmed)
      setPreviewResult(Number.isFinite(res) ? res : null)
    } catch {
      setPreviewResult(null)
    }
  }

  // Simple calculator functions
  const inputNumber = (num: string) => {
    animateButton()
    if (waitingForOperand) {
      setDisplay(String(num))
      setWaitingForOperand(false)
    } else {
      setDisplay(display === "0" ? String(num) : display + num)
    }
    setHasComputed(false)

    // Keep top expression in the same order as typed (unless user is manually editing it)
    if (!isManualExpression) {
      setExpression((prev) => {
        // If previous expression contains '=', start a new expression
        const wasComputed = prev.includes("=")
        const base = wasComputed ? "" : prev
        // Decide spacing: if starting or just after an operator, add space before number
        if (!base || /[+\-*/]\s*$/.test(base)) {
          const next = (base ? base + " " : "") + num
          updatePreviewFrom(next)
          return next
        }
        const next = base + num
        updatePreviewFrom(next)
        return next
      })
    }
  }

  const inputOperation = (nextOperation: string) => {
    animateButton()
    const inputValue = Number.parseFloat(display)

    // Append the current typed value and the operator to the expression (unless manually edited)
    if (!isManualExpression) {
      setExpression((prev) => {
        // If expression already had '=', start fresh with current display
        let base = prev.includes("=") ? "" : (prev || "")
        base = base.trim()
        const endsWithOp = /[+\-*/]\s*$/.test(base)
        const endsWithNumber = /[0-9)]$/.test(base)
        if (endsWithOp) {
          // Replace the previous operator with the new one
          const next = base.replace(/[+\-*/]\s*$/,'') + ` ${nextOperation}`
          updatePreviewFrom(next)
          return next
        }
        // Ensure the current input value appears at least once before the operator
        let next = base
        if (!endsWithNumber) {
          next += (next ? ' ' : '') + String(inputValue)
        }
        next = `${next} ${nextOperation}`
        updatePreviewFrom(next)
        return next
      })
    }

    // Do not compute on operator press; wait for next number or '='
    if (previousValue === null) {
      setPreviousValue(inputValue)
    }

    setWaitingForOperand(true)
    setOperation(nextOperation)
    setHasComputed(false)
  }

  const calculate = (firstValue: number, secondValue: number, operation: string) => {
    switch (operation) {
      case "+":
        return firstValue + secondValue
      case "-":
        return firstValue - secondValue
      case "*":
        return firstValue * secondValue
      case "/":
        return firstValue / secondValue
      case "=":
        return secondValue
      default:
        return secondValue
    }
  }

  const performCalculation = async () => {
    animateButton()
    // If user manually edited expression, evaluate it directly
    if (isManualExpression && expression.trim()) {
      try {
        const rawExpr = expression.includes("=") ? expression.split("=")[0].trim() : expression.trim()
        const newValue = CalculatorService.evaluateExpression(rawExpr)

        setDisplay(String(newValue))
        setPreviousValue(null)
        setOperation(null)
        setWaitingForOperand(true)
        setExpression(`${rawExpr} = ${newValue}`)
        setHasComputed(true)
        setIsManualExpression(false)

        if (user) {
          try {
            await CalculatorService.saveCalculation(user.id, rawExpr, newValue, "basic")
          } catch (error) {
            console.error("Error saving calculation:", error)
          }
        }
      } catch (e) {
        Alert.alert("Error", "Invalid expression")
      }
      return
    }

    // Normal keypad flow: evaluate full expression string on '='
    const trimmed = (expression || "").trim()
    if (!trimmed) return
    try {
      // If expression ends with an operator, append the current display as the last operand
      const endsWithOp = /[+\-*/]\s*$/.test(trimmed)
      const rawExpr = endsWithOp ? `${trimmed} ${display}` : trimmed

      const result = CalculatorService.evaluateExpression(rawExpr)

      setDisplay(String(result))
      setPreviousValue(null)
      setOperation(null)
      setWaitingForOperand(true)
      setExpression(`${rawExpr} = ${result}`)
      setHasComputed(true)
      setPreviewResult(null)

      if (user) {
        try {
          await CalculatorService.saveCalculation(user.id, rawExpr, result, "basic")
        } catch (error) {
          console.error("Error saving calculation:", error)
        }
      }
    } catch (e) {
      Alert.alert("Error", "Invalid expression")
    }
  }

  const clearCalculator = () => {
    animateButton()
    setDisplay("0")
    setPreviousValue(null)
    setOperation(null)
    setWaitingForOperand(false)
    setExpression("")
    setHasComputed(false)
    setIsManualExpression(false)
    setPreviewResult(null)
  }

  const saveSimpleCalculationToNotes = async () => {
    if (!user) return
    if (!hasComputed || !expression) {
      Alert.alert("Nothing to save", "Please perform a calculation first.")
      return
    }
    const title = `Calculator Result - ${new Date().toLocaleDateString()}`
    const content = `Calculation: ${expression || display}\nResult: ${display}\nCalculated on: ${new Date().toLocaleString()}`

    const calculationData: CalculationData = {
      type: "basic",
      expression: expression || display,
      result: Number.parseFloat(display),
      timestamp: new Date().toISOString(),
    }

    try {
      await CalculatorService.saveCalculationToNotes(user.id, title, content, calculationData)
      Alert.alert("Saved", "Calculation saved to notes.")
    } catch (error) {
      Alert.alert("Error", "Failed to save calculation to notes")
    }
  }

  // Interest calculator functions
  const [fromDate, setFromDate] = useState<Date | null>(null)
  const [toDate, setToDate] = useState<Date | null>(null)
  const [showFromPicker, setShowFromPicker] = useState(false)
  const [showToPicker, setShowToPicker] = useState(false)

  const calculateInterest = async () => {
    if (
      !interestForm.name ||
      !interestForm.amount ||
      !interestForm.rate ||
      !fromDate ||
      !toDate
    ) {
      Alert.alert("Error", "Please fill in all fields")
      return
    }

    try {
      const result = CalculatorService.calculateInterest(
        Number.parseFloat(interestForm.amount),
        Number.parseFloat(interestForm.rate),
        fromDate.toISOString().slice(0,10),
        toDate.toISOString().slice(0,10),
      )
      // Save to history DB automatically so History shows it
      if (user) {
        try {
          const expr = `${interestForm.name}: ₹${result.principal} at ${result.rate}%/mo for ${result.breakdown?.years || 0}y ${result.breakdown?.months || 0}m ${result.breakdown?.days || 0}d`
          await CalculatorService.saveCalculation(user.id, expr, result.totalAmount, "interest", {
            name: interestForm.name,
            principal: result.principal,
            rate: result.rate,
            fromDate: fromDate.toISOString().slice(0,10),
            toDate: toDate.toISOString().slice(0,10),
            elapsedDays: result.elapsedDays,
            interest: result.interest,
            breakdown: result.breakdown,
          })
          setHistoryRefresh((v) => v + 1)
        } catch (e) {
          console.warn('Failed to save interest calc to history', e)
        }
      }
      // Show a styled summary modal (store meta we need, then clear form fields)
      setInterestResult({
        ...result,
        name: interestForm.name,
        fromDate: fromDate.toISOString().slice(0,10),
        toDate: toDate.toISOString().slice(0,10),
      })
      setShowInterestSummary(true)
      // Clear input fields immediately after calculate
      setInterestForm({ name: "", amount: "", rate: "", fromDate: "", toDate: "" })
      setFromDate(null)
      setToDate(null)
    } catch (error) {
      Alert.alert("Error", "Invalid input values")
    }
  }

  const saveInterestToNotes = async (result: any) => {
    if (!user) return

    const title = `Interest Calculation - ${result.name || ""}`
    const content = `Interest Calculation Results:
Name: ${result.name || ""}
Principal Amount: ₹${result.principal.toLocaleString()}
Interest Rate: ${result.rate}% per month
Period: ${result.fromDate} to ${result.toDate}
Elapsed: ${result.breakdown?.years || 0}y ${result.breakdown?.months || 0}m ${result.breakdown?.days || 0}d
Interest Earned: ₹${result.interest.toLocaleString()}
Total Amount: ₹${result.totalAmount.toLocaleString()}

Calculated on: ${new Date().toLocaleString()}`

    const calculationData: CalculationData = {
      type: "interest",
      expression: `${result.name || ""}: ₹${result.principal} at ${result.rate}%/mo for ${result.breakdown?.years || 0}y ${result.breakdown?.months || 0}m ${result.breakdown?.days || 0}d`,
      result: result.totalAmount,
      timestamp: new Date().toISOString(),
      metadata: {
        name: result.name || "",
        principal: result.principal,
        rate: result.rate,
       fromDate: result.fromDate,
       toDate: result.toDate,
        elapsedDays: result.elapsedDays,
        interest: result.interest,
      },
    }

    try {
      await CalculatorService.saveCalculationToNotes(user.id, title, content, calculationData)
      Alert.alert("Success", "Interest calculation saved to notes!")
      setShowInterestSummary(false)
      setInterestForm({ name: "", amount: "", rate: "", fromDate: "", toDate: "" })
    } catch (error) {
      Alert.alert("Error", "Failed to save to notes")
    }
  }

  const renderInterestResultModal = () => (
    <Modal visible={showInterestSummary} transparent animationType="slide" onRequestClose={() => setShowInterestSummary(false)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
        <LinearGradient colors={["#FFFFFF", "#F3F4F6"]} style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 }}>
          <View style={{ alignItems: 'center', marginBottom: 12 }}>
            <View style={{ width: 60, height: 5, borderRadius: 3, backgroundColor: '#E5E7EB' }} />
          </View>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8 }}>Interest Summary</Text>
          {interestResult && (
            <View>
              <Text style={{ color: '#374151', fontWeight: '600', marginBottom: 6 }}>{interestResult.name}</Text>
              <View style={{ backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginBottom: 10 }}>
                <Text style={{ color: '#6B7280' }}>Principal</Text>
                <Text style={{ color: '#111827', fontSize: 22, fontWeight: '700' }}>₹{interestResult.principal.toLocaleString()}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                <View style={{ flex: 1, backgroundColor: '#EEF2FF', borderRadius: 12, padding: 12 }}>
                  <Text style={{ color: '#4F46E5', fontSize: 12, fontWeight: '700' }}>Rate (per month)</Text>
                  <Text style={{ color: '#3730A3', fontSize: 18, fontWeight: '800' }}>{interestResult.rate}%</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#ECFDF5', borderRadius: 12, padding: 12 }}>
                  <Text style={{ color: '#047857', fontSize: 12, fontWeight: '700' }}>Elapsed</Text>
                  <Text style={{ color: '#065F46', fontSize: 16, fontWeight: '700' }}>{interestResult.breakdown?.years || 0}y {interestResult.breakdown?.months || 0}m {interestResult.breakdown?.days || 0}d</Text>
                </View>
              </View>
              {interestResult.breakdown && (
                <View style={{ backgroundColor: '#F3F4F6', borderRadius: 12, padding: 12, marginBottom: 10 }}>
                  <Text style={{ color: '#6B7280', marginBottom: 8, fontWeight: '700' }}>Interest Breakdown</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ color: '#374151' }}>Days</Text>
                    <Text style={{ color: '#111827', fontWeight: '700' }}>₹{interestResult.breakdown.interestDays.toLocaleString()}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ color: '#374151' }}>Months</Text>
                    <Text style={{ color: '#111827', fontWeight: '700' }}>₹{interestResult.breakdown.interestMonths.toLocaleString()}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: '#374151' }}>Years</Text>
                    <Text style={{ color: '#111827', fontWeight: '700' }}>₹{interestResult.breakdown.interestYears.toLocaleString()}</Text>
                  </View>
                </View>
              )}
              <View style={{ backgroundColor: '#FFF7ED', borderRadius: 12, padding: 12, marginBottom: 12 }}>
                <Text style={{ color: '#9A3412', fontSize: 12, fontWeight: '700' }}>Total Amount</Text>
                <Text style={{ color: '#7C2D12', fontSize: 28, fontWeight: '900' }}>₹{interestResult.totalAmount.toLocaleString()}</Text>
              </View>
            </View>
          )}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity onPress={() => { if (interestResult) saveInterestToNotes(interestResult) }} style={{ flex: 1 }}>
              <LinearGradient colors={["#6366F1", "#8B5CF6"]} style={{ paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}>
                <Text style={{ color: 'white', fontWeight: '700' }}>Save to Notes</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowInterestSummary(false)} style={{ flex: 1 }}>
              <LinearGradient colors={["#9CA3AF", "#6B7280"]} style={{ paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}>
                <Text style={{ color: 'white', fontWeight: '700' }}>Close</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  )

  // BMI calculator functions
  const calculateBMI = async () => {
    if (!bmiForm.name || !bmiForm.height || !bmiForm.weight) {
      Alert.alert("Error", "Please fill in all fields")
      return
    }

    try {
      const result = CalculatorService.calculateBMI(
        Number.parseFloat(bmiForm.height),
        Number.parseFloat(bmiForm.weight),
      )
      // Save to history DB automatically
      if (user) {
        try {
          const expression = `${bmiForm.name}: BMI for ${result.height}cm, ${result.weight}kg`
          await CalculatorService.saveCalculation(user.id, expression, result.bmi, "bmi", {
            name: bmiForm.name,
            height: result.height,
            weight: result.weight,
            category: result.category,
            healthStatus: result.healthStatus,
          })
          setHistoryRefresh((v) => v + 1)
        } catch (e) {
          console.warn('Failed to save BMI calc to history', e)
        }
      }
      // Show BMI summary modal, attach name, then clear form fields
      setBmiResult({ ...result, name: bmiForm.name })
      setShowBMISummary(true)
      setBmiForm({ name: "", height: "", weight: "" })
    } catch (error) {
      Alert.alert("Error", "Invalid input values")
    }
  }

  const saveBMIToNotes = async (result: any) => {
    if (!user) return

    const title = `BMI Calculation - ${result.name || ""}`
    const content = `BMI Calculation Results:
Name: ${result.name || ""}
Height: ${result.height} cm
Weight: ${result.weight} kg
BMI: ${result.bmi}
Category: ${result.category}

Health Status: ${result.healthStatus}

Calculated on: ${new Date().toLocaleString()}`

    const calculationData: CalculationData = {
      type: "bmi",
      expression: `${result.name || ""}: BMI for ${result.height}cm, ${result.weight}kg`,
      result: result.bmi,
      timestamp: new Date().toISOString(),
      metadata: {
        name: result.name || "",
        height: result.height,
        weight: result.weight,
        category: result.category,
        healthStatus: result.healthStatus,
      },
    }

    try {
      await CalculatorService.saveCalculationToNotes(user.id, title, content, calculationData)
      Alert.alert("Success", "BMI calculation saved to notes!")
      setShowBMISummary(false)
      setBmiForm({ name: "", height: "", weight: "" })
    } catch (error) {
      Alert.alert("Error", "Failed to save to notes")
    }
  }

  const renderBMIResultModal = () => (
    <Modal visible={showBMISummary} transparent animationType="slide" onRequestClose={() => setShowBMISummary(false)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
        <LinearGradient colors={["#FFFFFF", "#F3F4F6"]} style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 }}>
          <View style={{ alignItems: 'center', marginBottom: 12 }}>
            <View style={{ width: 60, height: 5, borderRadius: 3, backgroundColor: '#E5E7EB' }} />
          </View>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8 }}>BMI Summary</Text>
          {bmiResult && (
            <View>
              <Text style={{ color: '#374151', fontWeight: '600', marginBottom: 6 }}>{bmiResult.name}</Text>
              <View style={{ backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginBottom: 10 }}>
                <Text style={{ color: '#6B7280' }}>BMI</Text>
                <Text style={{ color: '#111827', fontSize: 26, fontWeight: '800' }}>{bmiResult.bmi}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                <View style={{ flex: 1, backgroundColor: '#EEF2FF', borderRadius: 12, padding: 12 }}>
                  <Text style={{ color: '#4F46E5', fontSize: 12, fontWeight: '700' }}>Height (cm)</Text>
                  <Text style={{ color: '#3730A3', fontSize: 18, fontWeight: '800' }}>{bmiResult.height}</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#ECFDF5', borderRadius: 12, padding: 12 }}>
                  <Text style={{ color: '#047857', fontSize: 12, fontWeight: '700' }}>Weight (kg)</Text>
                  <Text style={{ color: '#065F46', fontSize: 18, fontWeight: '800' }}>{bmiResult.weight}</Text>
                </View>
              </View>
              <View style={{ backgroundColor: '#FFF7ED', borderRadius: 12, padding: 12, marginBottom: 12 }}>
                <Text style={{ color: '#9A3412', fontSize: 12, fontWeight: '700' }}>Category</Text>
                <Text style={{ color: '#7C2D12', fontSize: 18, fontWeight: '900' }}>{bmiResult.category}</Text>
              </View>
              <View style={{ backgroundColor: '#F3F4F6', borderRadius: 12, padding: 12, marginBottom: 12 }}>
                <Text style={{ color: '#6B7280', fontSize: 12, fontWeight: '700', marginBottom: 4 }}>Health Status</Text>
                <Text style={{ color: '#111827' }}>{bmiResult.healthStatus}</Text>
              </View>
            </View>
          )}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
            <TouchableOpacity onPress={() => { if (bmiResult) saveBMIToNotes(bmiResult) }} style={{ flex: 1 }}>
              <LinearGradient colors={["#6366F1", "#8B5CF6"]} style={{ paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}>
                <Text style={{ color: 'white', fontWeight: '700' }}>Save to Notes</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowBMISummary(false)} style={{ flex: 1 }}>
              <LinearGradient colors={["#9CA3AF", "#6B7280"]} style={{ paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}>
                <Text style={{ color: 'white', fontWeight: '700' }}>Close</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  )

  // Length conversion helpers
  const toMeters: Record<LengthUnit, number> = {
    mm: 0.001,
    cm: 0.01,
    m: 1,
    km: 1000,
    in: 0.0254,
    ft: 0.3048,
    yd: 0.9144,
    mi: 1609.344,
  }

  const unitNames: Record<LengthUnit, string> = {
    mm: 'millimeters',
    cm: 'centimeters',
    m: 'meters',
    km: 'kilometers',
    in: 'inches',
    ft: 'feet',
    yd: 'yards',
    mi: 'miles',
  }

  const convertLength = (val: number, from: LengthUnit, to: LengthUnit) => {
    if (!Number.isFinite(val)) return ""
    const meters = val * toMeters[from]
    const target = meters / toMeters[to]
    // limit decimals smartly
    const fixed = Math.abs(target) < 1 ? target.toFixed(6) : target.toFixed(4)
    return parseFloat(fixed).toString()
  }

  const onChangeValueA = (t: string) => {
    setLastEdited("A")
    setValueA(t)
    const num = Number.parseFloat(t)
    if (Number.isFinite(num)) {
      setValueB(convertLength(num, unitA, unitB))
    } else {
      setValueB("")
    }
  }

  const onChangeValueB = (t: string) => {
    setLastEdited("B")
    setValueB(t)
    const num = Number.parseFloat(t)
    if (Number.isFinite(num)) {
      setValueA(convertLength(num, unitB, unitA))
    } else {
      setValueA("")
    }
  }

  const onChangeUnitA = (u: LengthUnit) => {
    setUnitA(u)
    if (lastEdited === "A") {
      const num = Number.parseFloat(valueA)
      if (Number.isFinite(num)) setValueB(convertLength(num, u, unitB))
    } else {
      const num = Number.parseFloat(valueB)
      if (Number.isFinite(num)) setValueA(convertLength(num, unitB, u))
    }
  }

  const onChangeUnitB = (u: LengthUnit) => {
    setUnitB(u)
    if (lastEdited === "B") {
      const num = Number.parseFloat(valueB)
      if (Number.isFinite(num)) setValueA(convertLength(num, u, unitA))
    } else {
      const num = Number.parseFloat(valueA)
      if (Number.isFinite(num)) setValueB(convertLength(num, unitA, u))
    }
  }

  const renderUnitButton = (label: string, onPress: () => void) => (
    <TouchableOpacity onPress={onPress}>
      <LinearGradient colors={["#06B6D4", "#0EA5E9"]} style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 }}>
        <Text style={{ color: 'white', fontWeight: '700' }}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  )

  const renderLengthInline = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
      <LinearGradient colors={["rgba(255,255,255,0.9)", "rgba(255,255,255,0.7)"]} style={{ borderRadius: 25, padding: 24 }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#374151', marginBottom: 16 }}>Length Converter</Text>

        {/* Row A */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: '#6B7280', marginBottom: 8, fontWeight: '600' }}>From</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {renderUnitButton(unitA.toUpperCase(), () => setShowUnitPickerFor("A"))}
            <Text style={{ color: '#374151', fontWeight: '600', minWidth: 90 }}>{unitNames[unitA]}</Text>
            <View style={{ flex: 1 }}>
              <TextInput
                value={valueA}
                onChangeText={onChangeValueA}
                placeholder="Enter value"
                placeholderTextColor="#9CA3AF"
                keyboardType="decimal-pad"
                style={{ backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 12, padding: 12, color: '#111827', fontWeight: '700', fontSize: 18 }}
              />
            </View>
          </View>
        </View>

        {/* Row B */}
        <View style={{ marginBottom: 12 }}>
          <Text style={{ color: '#6B7280', marginBottom: 8, fontWeight: '600' }}>To</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {renderUnitButton(unitB.toUpperCase(), () => setShowUnitPickerFor("B"))}
            <Text style={{ color: '#374151', fontWeight: '600', minWidth: 90 }}>{unitNames[unitB]}</Text>
            <View style={{ flex: 1 }}>
              <TextInput
                value={valueB}
                onChangeText={onChangeValueB}
                placeholder="Enter value"
                placeholderTextColor="#9CA3AF"
                keyboardType="decimal-pad"
                style={{ backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 12, padding: 12, color: '#111827', fontWeight: '700', fontSize: 18 }}
              />
            </View>
          </View>
        </View>

        {/* Helper chips */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {["1", "10", "100", "1000"].map((preset) => (
            <TouchableOpacity key={preset} onPress={() => { setLastEdited('A'); setValueA(preset); setValueB(convertLength(Number(preset), unitA, unitB)) }}>
              <View style={{ backgroundColor: '#E0F2FE', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9999 }}>
                <Text style={{ color: '#0369A1', fontWeight: '700' }}>{preset}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {/* Unit Picker Modal */}
      <Modal visible={!!showUnitPickerFor} transparent animationType="fade" onRequestClose={() => setShowUnitPickerFor(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 }}>
          <LinearGradient colors={["#FFFFFF", "#F3F4F6"]} style={{ borderRadius: 20, padding: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 10 }}>Select Unit</Text>
            {lengthUnits.map((u) => (
              <TouchableOpacity
                key={u}
                onPress={() => {
                  if (showUnitPickerFor === 'A') onChangeUnitA(u)
                  else if (showUnitPickerFor === 'B') onChangeUnitB(u)
                  setShowUnitPickerFor(null)
                }}
                style={{ paddingVertical: 12, borderRadius: 10, paddingHorizontal: 10, marginBottom: 6, backgroundColor: '#F9FAFB' }}
              >
                <Text style={{ color: '#111827', fontWeight: '700' }}>{u.toUpperCase()} - {unitNames[u]}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowUnitPickerFor(null)}>
              <View style={{ backgroundColor: '#E5E7EB', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 6 }}>
                <Text style={{ color: '#374151', fontWeight: '700' }}>Cancel</Text>
              </View>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </Modal>
    </ScrollView>
  )

  const renderCalculatorButton = (title: string, onPress: () => void, buttonType?: string) => (
    <TouchableOpacity onPress={onPress} style={{ flex: 1, margin: 4 }}>
      <LinearGradient
        colors={
          buttonType === "operator"
            ? ["#F97316", "#EA580C"]
            : buttonType === "clear"
              ? ["#EF4444", "#DC2626"]
              : buttonType === "equals"
                ? ["#10B981", "#059669"]
                : ["rgba(255,255,255,0.9)", "rgba(255,255,255,0.7)"]
        }
        style={{
          height: 70,
          borderRadius: 20,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
      >
        <Text
          style={{
            fontSize: 24,
            fontWeight: "bold",
            color: buttonType ? "white" : "#374151",
          }}
        >
          {title}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  )

  const renderSimpleCalculator = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
      {/* Display */}
      <View style={{ marginBottom: 30 }}>
        <LinearGradient
          colors={["rgba(255,255,255,0.9)", "rgba(255,255,255,0.7)"]}
          style={{
            borderRadius: 25,
            padding: 24,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 5,
          }}
        >
          {/* Expression Display (editable, wraps to next line) */}
          <View style={{ marginBottom: 12 }}>
            <TextInput
              value={expression}
              onChangeText={(t) => {
                setExpression(t)
                setIsManualExpression(true)
                setHasComputed(false)
                setPreviousValue(null)
                setOperation(null)
              }}
              placeholder="Type here"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              multiline
              scrollEnabled
              textAlignVertical="top"
              style={{
                fontSize: 18,
                color: "#6B7280",
                fontWeight: "500",
                minHeight: 25,
                width: '100%',
                lineHeight: 22,
                maxHeight: 140,
              }}
            />
          </View>

          {/* Bottom result area: faint preview while editing, bold final after '=' */}
          {!hasComputed && previewResult !== null && (
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 40,
                  fontWeight: "bold",
                  color: "#374151",
                  opacity: 0.4,
                  minHeight: 48,
                  textAlign: 'right',
                }}
              >
                {previewResult}
              </Text>
            </View>
          )}
          {hasComputed && (
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 44,
                  fontWeight: "800",
                  color: "#111827",
                  minHeight: 52,
                  textAlign: 'right',
                }}
              >
                {display}
              </Text>
            </View>
          )}

          {/* Operation Indicator removed (duplicate of top expression) */}

          <TouchableOpacity onPress={saveSimpleCalculationToNotes}>
            <LinearGradient
              colors={["#6366F1", "#8B5CF6"]}
              style={{
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderRadius: 15,
                alignSelf: "flex-end",
              }}
            >
              <Text style={{ color: "white", fontWeight: "600" }}>Save to Notes</Text>
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>
      </View>

      {/* Calculator Buttons */}
      <View style={{ minHeight: 400 }}>
        {/* Row 1 */}
        <View style={{ flexDirection: "row", marginBottom: 8 }}>
          {renderCalculatorButton("C", clearCalculator, "clear")}
          {renderCalculatorButton("÷", () => inputOperation("/"), "operator")}
          {renderCalculatorButton("×", () => inputOperation("*"), "operator")}
          {renderCalculatorButton("⌫", () => setDisplay(display.slice(0, -1) || "0"), "operator")}
        </View>

        {/* Row 2 */}
        <View style={{ flexDirection: "row", marginBottom: 8 }}>
          {renderCalculatorButton("7", () => inputNumber("7"))}
          {renderCalculatorButton("8", () => inputNumber("8"))}
          {renderCalculatorButton("9", () => inputNumber("9"))}
          {renderCalculatorButton("-", () => inputOperation("-"), "operator")}
        </View>

        {/* Row 3 */}
        <View style={{ flexDirection: "row", marginBottom: 8 }}>
          {renderCalculatorButton("4", () => inputNumber("4"))}
          {renderCalculatorButton("5", () => inputNumber("5"))}
          {renderCalculatorButton("6", () => inputNumber("6"))}
          {renderCalculatorButton("+", () => inputOperation("+"), "operator")}
        </View>

        {/* Row 4 */}
        <View style={{ flexDirection: "row", marginBottom: 8 }}>
          {renderCalculatorButton("1", () => inputNumber("1"))}
          {renderCalculatorButton("2", () => inputNumber("2"))}
          {renderCalculatorButton("3", () => inputNumber("3"))}
          <View style={{ flex: 1, margin: 4 }}>
            <TouchableOpacity onPress={performCalculation} style={{ flex: 1 }}>
              <LinearGradient
                colors={["#10B981", "#059669"]}
                style={{
                  flex: 1,
                  borderRadius: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <Text style={{ fontSize: 24, fontWeight: "bold", color: "white" }}>=</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Row 5 */}
        <View style={{ flexDirection: "row" }}>
          <View style={{ flex: 2, margin: 4 }}>
            <TouchableOpacity onPress={() => inputNumber("0")} style={{ flex: 1 }}>
              <LinearGradient
                colors={["rgba(255,255,255,0.9)", "rgba(255,255,255,0.7)"]}
                style={{
                  height: 70,
                  borderRadius: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <Text style={{ fontSize: 24, fontWeight: "bold", color: "#374151" }}>0</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          {renderCalculatorButton(".", () => inputNumber("."))}
        </View>
      </View>
    </ScrollView>
  )

  const renderInterestInline = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
      <LinearGradient colors={["rgba(255,255,255,0.9)", "rgba(255,255,255,0.7)"]} style={{ borderRadius: 25, padding: 24 }}>
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#374151", marginBottom: 16 }}>Local Interest Calculator</Text>
        {renderModernInput("Name/Description", interestForm.name, (t) => setInterestForm({ ...interestForm, name: t }), "Type here")}
        {renderModernInput("Principal Amount(₹)", interestForm.amount, (t) => setInterestForm({ ...interestForm, amount: t }), "", "numeric")}
        {renderModernInput("Interest Rate(per month)", interestForm.rate, (t) => setInterestForm({ ...interestForm, rate: t }), "", "numeric")}

        {/* Date pickers */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: "#374151", marginBottom: 12, fontWeight: "600", fontSize: 16 }}>From Date</Text>
          <TouchableOpacity onPress={() => setShowFromPicker(true)} style={{ backgroundColor: "rgba(255,255,255,0.8)", borderRadius: 12, padding: 12 }}>
            <Text style={{ color: "#374151", fontWeight: "600" }}>{fromDate ? fromDate.toDateString() : "Select date"}</Text>
          </TouchableOpacity>
          {showFromPicker && (
            <DateTimePicker
              value={fromDate || new Date()}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(e: any, d?: Date) => {
                setShowFromPicker(Platform.OS === "ios")
                if (d) setFromDate(d)
              }}
            />
          )}
        </View>

        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: "#374151", marginBottom: 12, fontWeight: "600", fontSize: 16 }}>To Date</Text>
          <TouchableOpacity onPress={() => setShowToPicker(true)} style={{ backgroundColor: "rgba(255,255,255,0.8)", borderRadius: 12, padding: 12 }}>
            <Text style={{ color: "#374151", fontWeight: "600" }}>{toDate ? toDate.toDateString() : "Select date"}</Text>
          </TouchableOpacity>
          {showToPicker && (
            <DateTimePicker
              value={toDate || new Date()}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(e: any, d?: Date) => {
                setShowToPicker(Platform.OS === "ios")
                if (d) setToDate(d)
              }}
            />
          )}
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <TouchableOpacity onPress={calculateInterest} style={{ flex: 1 }}>
            <LinearGradient colors={["#10B981", "#059669"]} style={{ paddingVertical: 14, borderRadius: 12, alignItems: "center" }}>
              <Text style={{ color: "white", fontWeight: "bold", fontSize: 16 }}>Calculate</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </ScrollView>
  )


  const renderBMIInline = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
      <LinearGradient colors={["rgba(255,255,255,0.9)", "rgba(255,255,255,0.7)"]} style={{ borderRadius: 25, padding: 24 }}>
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#374151", marginBottom: 16 }}>BMI</Text>
        {renderModernInput("Name", bmiForm.name, (t) => setBmiForm({ ...bmiForm, name: t }), "Your name")}
        {renderModernInput("Height (cm)", bmiForm.height, (t) => setBmiForm({ ...bmiForm, height: t }), "", "numeric")}
        {renderModernInput("Weight (kg)", bmiForm.weight, (t) => setBmiForm({ ...bmiForm, weight: t }), "", "numeric")}
        <TouchableOpacity onPress={calculateBMI}>
          <LinearGradient colors={["#F59E0B", "#D97706"]} style={{ paddingVertical: 14, borderRadius: 12, alignItems: "center" }}>
            <Text style={{ color: "white", fontWeight: "bold", fontSize: 16 }}>Calculate BMI</Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </ScrollView>
  )

  const renderTabButtons = () => (
    <View style={{ paddingHorizontal: 20, paddingVertical: 16 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: "row", gap: 12 }}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id as CalculatorTab)}
            >
              <LinearGradient
                colors={activeTab === tab.id ? tab.gradient : ["rgba(255,255,255,0.3)", "rgba(255,255,255,0.1)"]}
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderRadius: 20,
                  flexDirection: "row",
                  alignItems: "center",
                  minWidth: 120,
                  justifyContent: "center",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={20}
                  color={activeTab === tab.id ? "white" : "rgba(255,255,255,0.8)"}
                />
                <Text
                  style={{
                    marginLeft: 8,
                    fontWeight: "600",
                    color: activeTab === tab.id ? "white" : "rgba(255,255,255,0.8)",
                  }}
                >
                  {tab.name}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  )

  const renderModernInput = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    placeholder: string,
    keyboardType?: any,
  ) => (
    <View style={{ marginBottom: 24 }}>
      <Text style={{ color: "#374151", marginBottom: 12, fontWeight: "600", fontSize: 16 }}>{label}</Text>
      <LinearGradient
        colors={["rgba(255,255,255,0.9)", "rgba(255,255,255,0.7)"]}
        style={{ borderRadius: 15, overflow: "hidden" }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          keyboardType={keyboardType}
          placeholderTextColor="rgba(0,0,0,0.4)"
          style={{
            paddingHorizontal: 16,
            paddingVertical: 16,
            color: "#374151",
            fontSize: 16,
          }}
        />
      </LinearGradient>
    </View>
  )

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#1F2937" />
      <LinearGradient colors={["#1F2937", "#374151", "#4B5563"]} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1 }}>
          {/* Header */}
          <View
            style={{
              paddingHorizontal: 20,
              paddingVertical: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View>
              <Text style={{ color: "white", fontSize: 28, fontWeight: "bold" }}>Calculator</Text>
              <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 16, marginTop: 4 }}>
                Advanced calculations made simple
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowHistoryModal(true)}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: "rgba(255,255,255,0.2)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="time-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Tab Buttons */}
          {renderTabButtons()}

          {/* Inline calculators */}
          {activeTab === "simple" && renderSimpleCalculator()}
          {activeTab === "interest" && renderInterestInline()}
          {activeTab === "bmi" && renderBMIInline()}
          {activeTab === "length" && renderLengthInline()}

          {/* Calculation History Modal */}
          <CalculationHistory visible={showHistoryModal} onClose={() => setShowHistoryModal(false)} refreshToken={historyRefresh} />
          {/* Interest Result Modal */}
          {renderInterestResultModal()}
          {/* BMI Result Modal */}
          {renderBMIResultModal()}
        </SafeAreaView>
      </LinearGradient>
    </>
  )
}
