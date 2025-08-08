"use client"

import { Ionicons } from "@expo/vector-icons"
import DateTimePicker from "@react-native-community/datetimepicker"
import { LinearGradient } from "expo-linear-gradient"
import { useRef, useState } from "react"
import {
  Alert,
  Animated,
  Dimensions,
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

type CalculatorTab = "simple" | "interest" | "bmi"

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

  const [interestResult, setInterestResult] = useState<any | null>(null)
  const [bmiResult, setBmiResult] = useState<any | null>(null)

  const tabs = [
    { id: "simple", name: "Simple", icon: "calculator", gradient: ["#6366F1", "#8B5CF6"] },
    { id: "interest", name: "Interest", icon: "trending-up", gradient: ["#10B981", "#059669"] },
    { id: "bmi", name: "BMI", icon: "fitness", gradient: ["#F59E0B", "#D97706"] },
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
  }

  const inputOperation = (nextOperation: string) => {
    animateButton()
    const inputValue = Number.parseFloat(display)

    if (previousValue === null) {
      setPreviousValue(inputValue)
      setExpression(`${inputValue} ${nextOperation}`)
    } else if (operation) {
      const currentValue = previousValue || 0
      const newValue = calculate(currentValue, inputValue, operation)

      setDisplay(String(newValue))
      setPreviousValue(newValue)
      setExpression(`${newValue} ${nextOperation}`)
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
    const inputValue = Number.parseFloat(display)

    if (previousValue !== null && operation) {
      const newValue = calculate(previousValue, inputValue, operation)
      const fullExpression = `${previousValue} ${operation} ${inputValue}`

      setDisplay(String(newValue))
      setPreviousValue(null)
      setOperation(null)
      setWaitingForOperand(true)
      setExpression(`${fullExpression} = ${newValue}`)
      setHasComputed(true)

      // Save to database
      if (user) {
        try {
          await CalculatorService.saveCalculation(user.id, fullExpression, newValue, "basic")
        } catch (error) {
          console.error("Error saving calculation:", error)
        }
      }
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
  }

  const saveSimpleCalculationToNotes = async () => {
    if (!user) return
    if (!hasComputed || !expression || !operation) {
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

      // Save to database FIRST
      if (user) {
        const expression = `${interestForm.name}: $${result.principal} at ${result.rate}% for ${result.elapsedDays} days`
        await CalculatorService.saveCalculation(user.id, expression, result.totalAmount, "interest", {
          name: interestForm.name,
          principal: result.principal,
          rate: result.rate,
          fromDate: fromDate.toISOString().slice(0,10),
          toDate: toDate.toISOString().slice(0,10),
          elapsedDays: result.elapsedDays,
          interest: result.interest,
        })
      }

      const resultText = `Interest Calculation Results:
Name: ${interestForm.name}
Principal Amount: $${result.principal.toLocaleString()}
Interest Rate: ${result.rate}% per annum
Period: ${fromDate.toISOString().slice(0,10)} to ${toDate.toISOString().slice(0,10)}
Elapsed Days: ${result.elapsedDays} days
Interest Earned: $${result.interest.toLocaleString()}
Total Amount: $${result.totalAmount.toLocaleString()}`

      setInterestResult(result)
      Alert.alert("Interest Calculation", resultText, [
        { text: "OK" },
        {
          text: "Save to Notes",
          onPress: () => saveInterestToNotes(result),
        },
      ])
    } catch (error) {
      Alert.alert("Error", "Invalid input values")
    }
  }

  const saveInterestToNotes = async (result: any) => {
    if (!user) return

    const title = `Interest Calculation - ${interestForm.name}`
    const content = `Interest Calculation Results:
Name: ${interestForm.name}
Principal Amount: $${result.principal.toLocaleString()}
Interest Rate: ${result.rate}% per annum
Period: ${fromDate?.toISOString().slice(0,10)} to ${toDate?.toISOString().slice(0,10)}
Elapsed Days: ${result.elapsedDays} days
Interest Earned: $${result.interest.toLocaleString()}
Total Amount: $${result.totalAmount.toLocaleString()}

Calculated on: ${new Date().toLocaleString()}`

    const calculationData: CalculationData = {
      type: "interest",
      expression: `${interestForm.name}: $${result.principal} at ${result.rate}% for ${result.elapsedDays} days`,
      result: result.totalAmount,
      timestamp: new Date().toISOString(),
      metadata: {
        name: interestForm.name,
        principal: result.principal,
        rate: result.rate,
       fromDate: fromDate?.toISOString().slice(0,10),
       toDate: toDate?.toISOString().slice(0,10),
        elapsedDays: result.elapsedDays,
        interest: result.interest,
      },
    }

    try {
      await CalculatorService.saveCalculationToNotes(user.id, title, content, calculationData)
      Alert.alert("Success", "Interest calculation saved to notes!")
      setShowInterestModal(false)
      setInterestForm({ name: "", amount: "", rate: "", fromDate: "", toDate: "" })
    } catch (error) {
      Alert.alert("Error", "Failed to save to notes")
    }
  }

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

      // Save to database FIRST
      if (user) {
        const expression = `${bmiForm.name}: BMI for ${result.height}cm, ${result.weight}kg`
        await CalculatorService.saveCalculation(user.id, expression, result.bmi, "bmi", {
          name: bmiForm.name,
          height: result.height,
          weight: result.weight,
          category: result.category,
          healthStatus: result.healthStatus,
        })
      }

      const resultText = `BMI Calculation Results:
Name: ${bmiForm.name}
Height: ${result.height} cm
Weight: ${result.weight} kg
BMI: ${result.bmi}
Category: ${result.category}

Health Status: ${result.healthStatus}`

      setBmiResult(result)
      Alert.alert("BMI Calculation", resultText, [
        { text: "OK" },
        {
          text: "Save to Notes",
          onPress: () => saveBMIToNotes(result),
        },
      ])
    } catch (error) {
      Alert.alert("Error", "Invalid input values")
    }
  }

  const saveBMIToNotes = async (result: any) => {
    if (!user) return

    const title = `BMI Calculation - ${bmiForm.name}`
    const content = `BMI Calculation Results:
Name: ${bmiForm.name}
Height: ${result.height} cm
Weight: ${result.weight} kg
BMI: ${result.bmi}
Category: ${result.category}

Health Status: ${result.healthStatus}

Calculated on: ${new Date().toLocaleString()}`

    const calculationData: CalculationData = {
      type: "bmi",
      expression: `${bmiForm.name}: BMI for ${result.height}cm, ${result.weight}kg`,
      result: result.bmi,
      timestamp: new Date().toISOString(),
      metadata: {
        name: bmiForm.name,
        height: result.height,
        weight: result.weight,
        category: result.category,
        healthStatus: result.healthStatus,
      },
    }

    try {
      await CalculatorService.saveCalculationToNotes(user.id, title, content, calculationData)
      Alert.alert("Success", "BMI calculation saved to notes!")
      setShowBMIModal(false)
      setBmiForm({ name: "", height: "", weight: "" })
    } catch (error) {
      Alert.alert("Error", "Failed to save to notes")
    }
  }

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
          {/* Expression Display */}
          {expression && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <Text
                style={{
                  fontSize: 18,
                  color: "#6B7280",
                  fontWeight: "500",
                  minHeight: 25,
                }}
              >
                {expression}
              </Text>
            </ScrollView>
          )}

          {/* Current Display */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 48,
                fontWeight: "bold",
                color: "#374151",
                minHeight: 60,
              }}
            >
              {display}
            </Text>
          </ScrollView>

          {/* Operation Indicator */}
          {operation && previousValue !== null && (
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
              <View
                style={{
                  backgroundColor: "#F97316",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 12,
                }}
              >
                <Text style={{ color: "white", fontWeight: "600", fontSize: 14 }}>
                  {previousValue} {operation} ...
                </Text>
              </View>
            </View>
          )}

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
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#374151", marginBottom: 16 }}>Simple Interest</Text>
        {renderModernInput("Name/Description", interestForm.name, (t) => setInterestForm({ ...interestForm, name: t }), "e.g., Savings Account")}
        {renderModernInput("Principal Amount ($)", interestForm.amount, (t) => setInterestForm({ ...interestForm, amount: t }), "10000", "numeric")}
        {renderModernInput("Interest Rate (% per annum)", interestForm.rate, (t) => setInterestForm({ ...interestForm, rate: t }), "5.5", "numeric")}

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
          <TouchableOpacity
            onPress={() => (interestResult ? saveInterestToNotes(interestResult) : Alert.alert("No result", "Please calculate first."))}
            style={{ flex: 1 }}
            disabled={!interestResult}
          >
            <LinearGradient
              colors={interestResult ? ["#6366F1", "#8B5CF6"] : ["#9CA3AF", "#6B7280"]}
              style={{ paddingVertical: 14, borderRadius: 12, alignItems: "center" }}
            >
              <Text style={{ color: "white", fontWeight: "bold", fontSize: 16 }}>Save to Notes</Text>
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
        {renderModernInput("Height (cm)", bmiForm.height, (t) => setBmiForm({ ...bmiForm, height: t }), "170", "numeric")}
        {renderModernInput("Weight (kg)", bmiForm.weight, (t) => setBmiForm({ ...bmiForm, weight: t }), "70", "numeric")}
        <TouchableOpacity onPress={calculateBMI}>
          <LinearGradient colors={["#F59E0B", "#D97706"]} style={{ paddingVertical: 14, borderRadius: 12, alignItems: "center" }}>
            <Text style={{ color: "white", fontWeight: "bold", fontSize: 16 }}>Calculate BMI</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => (bmiResult ? saveBMIToNotes(bmiResult) : Alert.alert("No result", "Please calculate first."))}
          style={{ marginTop: 10 }}
          disabled={!bmiResult}
        >
          <LinearGradient
            colors={bmiResult ? ["#6366F1", "#8B5CF6"] : ["#9CA3AF", "#6B7280"]}
            style={{ paddingVertical: 14, borderRadius: 12, alignItems: "center" }}
          >
            <Text style={{ color: "white", fontWeight: "bold", fontSize: 16 }}>Save to Notes</Text>
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

          {/* Calculation History Modal */}
          <CalculationHistory visible={showHistoryModal} onClose={() => setShowHistoryModal(false)} />
        </SafeAreaView>
      </LinearGradient>
    </>
  )
}
