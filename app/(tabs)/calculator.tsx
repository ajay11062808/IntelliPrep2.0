"use client"

import { Ionicons } from "@expo/vector-icons"
import { useEffect, useState } from "react"
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native"
import { useAuth } from "../../constants/AuthContext"
import type { Calculation } from "../../constants/types"
import { CalculatorService } from "../../services/calculatorService"
import { NotesService } from "../../services/notesService"

export default function CalculatorScreen() {
  const [display, setDisplay] = useState("0")
  const [previousValue, setPreviousValue] = useState<string | null>(null)
  const [operation, setOperation] = useState<string | null>(null)
  const [waitingForOperand, setWaitingForOperand] = useState(false)
  const [history, setHistory] = useState<Calculation[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveNoteTitle, setSaveNoteTitle] = useState("")
  const [saveNoteContent, setSaveNoteContent] = useState("")
  const [currentResult, setCurrentResult] = useState<number | null>(null)
  const [currentExpression, setCurrentExpression] = useState<string>("")

  // Interest calculator states
  const [showInterestCalc, setShowInterestCalc] = useState(false)
  const [principal, setPrincipal] = useState("")
  const [rate, setRate] = useState("")
  const [time, setTime] = useState("")
  const [compoundFrequency, setCompoundFrequency] = useState("1")
  const [interestType, setInterestType] = useState<"simple" | "compound">("simple")

  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      loadHistory()
    }
  }, [user])

  const loadHistory = async () => {
    if (!user) return

    try {
      const calculationHistory = await CalculatorService.getCalculationHistory(user.id)
      setHistory(calculationHistory)
    } catch (error) {
      console.error("Failed to load calculation history:", error)
    }
  }

  const inputDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit)
      setWaitingForOperand(false)
    } else {
      setDisplay(display === "0" ? digit : display + digit)
    }
  }

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay("0.")
      setWaitingForOperand(false)
    } else if (display.indexOf(".") === -1) {
      setDisplay(display + ".")
    }
  }

  const clear = () => {
    setDisplay("0")
    setPreviousValue(null)
    setOperation(null)
    setWaitingForOperand(false)
    setCurrentExpression("")
  }

  const performOperation = (nextOperation: string) => {
    const inputValue = Number.parseFloat(display)

    if (previousValue === null) {
      setPreviousValue(display)
      setCurrentExpression(display + " " + nextOperation + " ")
    } else if (operation) {
      const currentValue = previousValue || "0"
      const newValue = calculate(currentValue, display, operation)

      setDisplay(String(newValue))
      setPreviousValue(String(newValue))
      setCurrentExpression(currentExpression + display + " " + nextOperation + " ")
    }

    setWaitingForOperand(true)
    setOperation(nextOperation)
  }

  const calculate = (firstValue: string, secondValue: string, operation: string): number => {
    const prev = Number.parseFloat(firstValue)
    const current = Number.parseFloat(secondValue)

    switch (operation) {
      case "+":
        return prev + current
      case "-":
        return prev - current
      case "×":
        return prev * current
      case "÷":
        return current !== 0 ? prev / current : 0
      case "=":
        return current
      default:
        return current
    }
  }

  const handleEquals = async () => {
    if (operation && previousValue !== null) {
      const newValue = calculate(previousValue, display, operation)
      const expression = currentExpression + display + " = " + newValue

      setDisplay(String(newValue))
      setPreviousValue(null)
      setOperation(null)
      setWaitingForOperand(true)
      setCurrentResult(newValue)
      setCurrentExpression(expression)

      // Save to history
      if (user) {
        try {
          await CalculatorService.saveCalculation(user.id, expression, newValue, "basic")
          loadHistory()
        } catch (error) {
          console.error("Failed to save calculation:", error)
        }
      }
    }
  }

  const calculateInterest = async () => {
    const p = Number.parseFloat(principal)
    const r = Number.parseFloat(rate)
    const t = Number.parseFloat(time)
    const n = Number.parseFloat(compoundFrequency)

    if (isNaN(p) || isNaN(r) || isNaN(t) || p <= 0 || r <= 0 || t <= 0) {
      Alert.alert("Error", "Please enter valid positive numbers")
      return
    }

    let interest: number
    let expression: string

    if (interestType === "simple") {
      interest = CalculatorService.calculateSimpleInterest(p, r, t)
      expression = `Simple Interest: P=${p}, R=${r}%, T=${t} years = ${interest}`
    } else {
      interest = CalculatorService.calculateCompoundInterest(p, r, t, n)
      expression = `Compound Interest: P=${p}, R=${r}%, T=${t} years, n=${n} = ${interest}`
    }

    setDisplay(String(interest.toFixed(2)))
    setCurrentResult(interest)
    setCurrentExpression(expression)

    // Save to history
    if (user) {
      try {
        await CalculatorService.saveCalculation(user.id, expression, interest, interestType, {
          principal: p,
          rate: r,
          time: t,
          compoundFrequency: n,
        })
        loadHistory()
      } catch (error) {
        console.error("Failed to save calculation:", error)
      }
    }

    setShowInterestCalc(false)
  }

  const handleSaveToNotes = async () => {
    if (!user || currentResult === null) return

    if (!saveNoteTitle.trim()) {
      Alert.alert("Error", "Please enter a note title")
      return
    }

    try {
      const noteContent = saveNoteContent.trim()
        ? `${saveNoteContent}\n\nCalculation: ${currentExpression}`
        : `Calculation: ${currentExpression}`

      await NotesService.createNote(user.id, saveNoteTitle.trim(), noteContent, "calculation", true, false, {
        expression: currentExpression,
        result: currentResult,
        type: "basic",
      })

      Alert.alert("Success", "Calculation saved to notes!")
      setShowSaveModal(false)
      setSaveNoteTitle("")
      setSaveNoteContent("")
    } catch (error: any) {
      Alert.alert("Error", "Failed to save to notes")
    }
  }

  const renderButton = (text: string, onPress: () => void, style?: any) => (
    <TouchableOpacity style={[styles.button, style]} onPress={onPress}>
      <Text style={[styles.buttonText, style?.color && { color: style.color }]}>{text}</Text>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Calculator</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.headerButton} onPress={() => setShowInterestCalc(true)}>
            <Ionicons name="trending-up" size={24} color="#2196F3" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={() => setShowHistory(true)}>
            <Ionicons name="time" size={24} color="#2196F3" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.displayContainer}>
        <Text style={styles.display}>{display}</Text>
        {currentExpression && <Text style={styles.expression}>{currentExpression}</Text>}
      </View>

      <View style={styles.buttonContainer}>
        <View style={styles.row}>
          {renderButton("C", clear, styles.operatorButton)}
          {renderButton("±", () => {}, styles.operatorButton)}
          {renderButton("%", () => {}, styles.operatorButton)}
          {renderButton("÷", () => performOperation("÷"), styles.operatorButton)}
        </View>

        <View style={styles.row}>
          {renderButton("7", () => inputDigit("7"))}
          {renderButton("8", () => inputDigit("8"))}
          {renderButton("9", () => inputDigit("9"))}
          {renderButton("×", () => performOperation("×"), styles.operatorButton)}
        </View>

        <View style={styles.row}>
          {renderButton("4", () => inputDigit("4"))}
          {renderButton("5", () => inputDigit("5"))}
          {renderButton("6", () => inputDigit("6"))}
          {renderButton("-", () => performOperation("-"), styles.operatorButton)}
        </View>

        <View style={styles.row}>
          {renderButton("1", () => inputDigit("1"))}
          {renderButton("2", () => inputDigit("2"))}
          {renderButton("3", () => inputDigit("3"))}
          {renderButton("+", () => performOperation("+"), styles.operatorButton)}
        </View>

        <View style={styles.row}>
          {renderButton("0", () => inputDigit("0"), styles.zeroButton)}
          {renderButton(".", inputDecimal)}
          {renderButton("=", handleEquals, styles.equalsButton)}
        </View>
      </View>

      {currentResult !== null && (
        <TouchableOpacity style={styles.saveButton} onPress={() => setShowSaveModal(true)}>
          <Ionicons name="save" size={20} color="white" />
          <Text style={styles.saveButtonText}>Save to Notes</Text>
        </TouchableOpacity>
      )}

      {/* History Modal */}
      <Modal visible={showHistory} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Calculation History</Text>
            <TouchableOpacity onPress={() => setShowHistory(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.historyList}>
            {history.map((item) => (
              <View key={item.id} style={styles.historyItem}>
                <Text style={styles.historyExpression}>{item.expression}</Text>
                <Text style={styles.historyDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Interest Calculator Modal */}
      <Modal visible={showInterestCalc} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Interest Calculator</Text>
            <TouchableOpacity onPress={() => setShowInterestCalc(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.interestForm}>
            <View style={styles.interestTypeSelector}>
              <TouchableOpacity
                style={[styles.interestTypeButton, interestType === "simple" && styles.interestTypeButtonActive]}
                onPress={() => setInterestType("simple")}
              >
                <Text
                  style={[
                    styles.interestTypeButtonText,
                    interestType === "simple" && styles.interestTypeButtonTextActive,
                  ]}
                >
                  Simple Interest
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.interestTypeButton, interestType === "compound" && styles.interestTypeButtonActive]}
                onPress={() => setInterestType("compound")}
              >
                <Text
                  style={[
                    styles.interestTypeButtonText,
                    interestType === "compound" && styles.interestTypeButtonTextActive,
                  ]}
                >
                  Compound Interest
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Principal Amount</Text>
              <TextInput
                style={styles.input}
                value={principal}
                onChangeText={setPrincipal}
                placeholder="Enter principal amount"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Interest Rate (%)</Text>
              <TextInput
                style={styles.input}
                value={rate}
                onChangeText={setRate}
                placeholder="Enter interest rate"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Time (years)</Text>
              <TextInput
                style={styles.input}
                value={time}
                onChangeText={setTime}
                placeholder="Enter time in years"
                keyboardType="numeric"
              />
            </View>

            {interestType === "compound" && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Compounding Frequency (per year)</Text>
                <TextInput
                  style={styles.input}
                  value={compoundFrequency}
                  onChangeText={setCompoundFrequency}
                  placeholder="Enter compounding frequency"
                  keyboardType="numeric"
                />
              </View>
            )}

            <TouchableOpacity style={styles.calculateButton} onPress={calculateInterest}>
              <Text style={styles.calculateButtonText}>Calculate Interest</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Save to Notes Modal */}
      <Modal visible={showSaveModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Save to Notes</Text>
            <TouchableOpacity onPress={() => setShowSaveModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.saveForm}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Note Title</Text>
              <TextInput
                style={styles.input}
                value={saveNoteTitle}
                onChangeText={setSaveNoteTitle}
                placeholder="Enter note title"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Additional Context (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={saveNoteContent}
                onChangeText={setSaveNoteContent}
                placeholder="Add any additional context or notes..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.calculationPreview}>
              <Text style={styles.calculationPreviewLabel}>Calculation:</Text>
              <Text style={styles.calculationPreviewText}>{currentExpression}</Text>
            </View>

            <TouchableOpacity style={styles.saveToNotesButton} onPress={handleSaveToNotes}>
              <Text style={styles.saveToNotesButtonText}>Save to Notes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  headerButtons: {
    flexDirection: "row",
    gap: 12,
  },
  headerButton: {
    padding: 8,
  },
  displayContainer: {
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingVertical: 30,
    alignItems: "flex-end",
  },
  display: {
    fontSize: 48,
    fontWeight: "300",
    color: "#333",
  },
  expression: {
    fontSize: 16,
    color: "#666",
    marginTop: 8,
  },
  buttonContainer: {
    flex: 1,
    padding: 20,
  },
  row: {
    flexDirection: "row",
    marginBottom: 12,
    gap: 12,
  },
  button: {
    flex: 1,
    height: 70,
    backgroundColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 24,
    fontWeight: "400",
    color: "#333",
  },
  operatorButton: {
    backgroundColor: "#2196F3",
    color: "white",
  },
  equalsButton: {
    backgroundColor: "#4CAF50",
    color: "white",
  },
  zeroButton: {
    flex: 2,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2196F3",
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "white",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
  },
  historyList: {
    flex: 1,
    padding: 20,
  },
  historyItem: {
    backgroundColor: "#f9f9f9",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  historyExpression: {
    fontSize: 16,
    color: "#333",
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 12,
    color: "#666",
  },
  interestForm: {
    flex: 1,
    padding: 20,
  },
  interestTypeSelector: {
    flexDirection: "row",
    marginBottom: 20,
    gap: 12,
  },
  interestTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2196F3",
    alignItems: "center",
  },
  interestTypeButtonActive: {
    backgroundColor: "#2196F3",
  },
  interestTypeButtonText: {
    fontSize: 14,
    color: "#2196F3",
    fontWeight: "600",
  },
  interestTypeButtonTextActive: {
    color: "white",
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#f9f9f9",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  textArea: {
    height: 100,
  },
  calculateButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  calculateButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  saveForm: {
    flex: 1,
    padding: 20,
  },
  calculationPreview: {
    backgroundColor: "#f9f9f9",
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  calculationPreviewLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 4,
  },
  calculationPreviewText: {
    fontSize: 16,
    color: "#333",
  },
  saveToNotesButton: {
    backgroundColor: "#2196F3",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  saveToNotesButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
})
