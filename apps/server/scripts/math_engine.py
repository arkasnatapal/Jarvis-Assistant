import sys
import os
import re
import json
from datetime import datetime

try:
    import sympy as sp
    HAS_SYMPY = True
except ImportError:
    HAS_SYMPY = False

try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False

try:
    import scipy.signal as signal
    HAS_SCIPY = True
except ImportError:
    HAS_SCIPY = False

try:
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    HAS_MATPLOTLIB = True
except ImportError:
    HAS_MATPLOTLIB = False

def preprocess_spoken_math(text_in):
    """
    Normalizes spoken math phrases into clean mathematical expressions.
    e.g. 'do 566 / 2' -> '566 / 2'
    e.g. '566 multiplied by 2' -> '566 * 2'
    e.g. '1 by 2s plus 6 plus a square' -> '1/(2*s + 6 + s**2)'
    """
    text = text_in.lower().strip()
    
    # Strip conversational prefixes
    text = re.sub(r'^(do|calculate|what is|find the|find|tell me|eval|evaluate)\s+', '', text)
    
    # Replace STT phonetics
    text = re.sub(r'\b(board|body|bold|boat|both|baud|bowed|bird)\s+plot\b', 'bode plot', text)
    text = re.sub(r'\b(board|body|bold|boat|both|baud|bowed|bird)\s+diagram\b', 'bode plot', text)
    text = re.sub(r'\b(route|road|root)\s+(locus|location|local)\b', 'root locus', text)
    
    # Operators (Order is critical: multi-word operators first!)
    text = re.sub(r'\bmultiplied by\b', '*', text)
    text = re.sub(r'\bdivided by\b', '/', text)
    text = re.sub(r'\b(times|into)\b', '*', text)
    text = re.sub(r'\b(over|by)\b', '/', text)
    text = re.sub(r'\bplus\b', '+', text)
    text = re.sub(r'\bminus\b', '-', text)
    
    # Powers
    text = re.sub(r'\b(a square|s square|s squared)\b', 's**2', text)
    text = re.sub(r'\b(s cube|s cubed)\b', 's**3', text)
    text = text.replace('^', '**')
    
    # Number words
    num_words = {
        'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
        'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10'
    }
    for word, digit in num_words.items():
        text = re.sub(r'\b' + word + r'\b', digit, text)
        
    # Implicit coefficients (e.g., '2s' -> '2*s', '6s' -> '6*s')
    text = re.sub(r'(\d)\s*s\b', r'\1*s', text)
    text = re.sub(r'\b(\d+)\s*([a-zA-Z])', r'\1*\2', text)
            
    return text.strip()

def parse_transfer_function(expr_text):
    """
    Parses ANY rational transfer function dynamically in s (e.g. '1/s^2+2s+5', 's+2 / s^2+4s+13', '5 / s*(s+1)*(s+2)')
    Returns numerator coefficients, denominator coefficients, and clean string representation.
    """
    clean_text = preprocess_spoken_math(expr_text)
    
    # Strip command keywords from start
    clean_text = re.sub(
        r'^(find\s+the|find|get|draw|show|calculate|compute)?\s*(the\s*)?(bode\s+plot|bode\s+diagram|bode|root\s+locus|locus|step\s+response|plot)\s*(for|of)?\s*',
        '',
        clean_text,
        flags=re.IGNORECASE
    ).strip()

    if '/' in clean_text:
        parts = clean_text.split('/', 1)
        num_str = parts[0].strip()
        den_str = parts[1].strip()
        if ('+' in num_str or '-' in num_str) and not num_str.startswith('('):
            num_str = f'({num_str})'
        if not den_str.startswith('('):
            den_str = f'({den_str})'
        clean_text = f'{num_str}/{den_str}'

    if not HAS_SYMPY:
        return [1.0], [1.0, 2.0, 5.0], clean_text

    try:
        s = sp.Symbol('s')
        parsed = sp.sympify(clean_text)
        num, den = sp.fraction(parsed)
        
        num_exp = sp.expand(num)
        den_exp = sp.expand(den)
        
        num_poly = sp.Poly(num_exp, s) if s in num_exp.free_symbols else None
        den_poly = sp.Poly(den_exp, s) if s in den_exp.free_symbols else None
        
        num_coeffs = [float(c) for c in num_poly.all_coeffs()] if num_poly else [float(num_exp)]
        den_coeffs = [float(c) for c in den_poly.all_coeffs()] if den_poly else [float(den_exp)]
        
        return num_coeffs, den_coeffs, str(parsed)
    except Exception as e:
        nums = [float(x) for x in re.findall(r'[-+]?\d*\.\d+|\d+', clean_text)]
        if len(nums) >= 2:
            return [nums[0]], [1.0] + nums[1:], clean_text
        return [1.0], [1.0, 2.0, 5.0], clean_text

def handle_math(expression):
    expr_str = expression.strip()
    if not expr_str:
        return {"success": False, "error": "Empty expression provided."}

    # Normalize STT phonetics and operators
    clean_expr = preprocess_spoken_math(expr_str)

    # 1. Integration (e.g. "integrate sin(x)", "integral of x^2")
    if "integrate" in clean_expr.lower() or "integral" in clean_expr.lower():
        formula = re.sub(r'^(integrate|integral of|integral)\s+', '', clean_expr, flags=re.IGNORECASE).strip()
        if HAS_SYMPY:
            try:
                x = sp.Symbol('x')
                parsed = sp.sympify(formula)
                res = sp.integrate(parsed, x)
                return {
                    "success": True,
                    "type": "integration",
                    "expression": formula,
                    "result": f"{res} + C",
                    "message": f"Integral of {formula} with respect to x is: {res} + C"
                }
            except Exception as e:
                return {"success": False, "error": f"Integration error: {str(e)}"}
        return {"success": False, "error": "SymPy is required for integration."}

    # 2. Differentiation / Derivative (e.g. "diff x^3", "derivative of cos(x)")
    if "diff" in clean_expr.lower() or "derivative" in clean_expr.lower():
        formula = re.sub(r'^(diff|derivative of|derivative)\s+', '', clean_expr, flags=re.IGNORECASE).strip()
        if HAS_SYMPY:
            try:
                x = sp.Symbol('x')
                parsed = sp.sympify(formula)
                res = sp.diff(parsed, x)
                return {
                    "success": True,
                    "type": "differentiation",
                    "expression": formula,
                    "result": str(res),
                    "message": f"Derivative of {formula} with respect to x is: {res}"
                }
            except Exception as e:
                return {"success": False, "error": f"Differentiation error: {str(e)}"}
        return {"success": False, "error": "SymPy is required for differentiation."}

    # 3. Solve Equation (e.g. "solve x^2 - 4", "solve 2*x + 5 = 15")
    if "solve" in clean_expr.lower():
        formula = re.sub(r'^solve\s+', '', clean_expr, flags=re.IGNORECASE).strip()
        if HAS_SYMPY:
            try:
                x = sp.Symbol('x')
                if "=" in formula:
                    lhs, rhs = formula.split("=")
                    parsed = sp.sympify(lhs) - sp.sympify(rhs)
                else:
                    parsed = sp.sympify(formula)
                res = sp.solve(parsed, x)
                return {
                    "success": True,
                    "type": "solve",
                    "expression": formula,
                    "result": str(res),
                    "message": f"Solutions for {formula}: {res}"
                }
            except Exception as e:
                return {"success": False, "error": f"Solve error: {str(e)}"}
        return {"success": False, "error": "SymPy is required for solving equations."}

    # 4. Matrix Math (e.g. "matrix det [[1,2],[3,4]]", "matrix inv [[1,2],[3,4]]", "matrix eigenvalues [[1,2],[3,4]]")
    if "matrix" in clean_expr.lower() or "mat " in clean_expr.lower() or "[[" in clean_expr:
        if HAS_SYMPY:
            try:
                mat_match = re.search(r'\[\[.*?\]\]', clean_expr)
                if mat_match:
                    mat_data = json.loads(mat_match.group(0))
                    M = sp.Matrix(mat_data)
                    
                    if "det" in clean_expr.lower() or "determinant" in clean_expr.lower():
                        det_val = M.det()
                        res_val = int(det_val) if hasattr(det_val, 'is_integer') and det_val.is_integer else (float(det_val) if det_val.is_real else str(det_val))
                        return {"success": True, "type": "matrix_det", "result": res_val, "message": f"Matrix Determinant: {res_val}"}
                    elif "inv" in clean_expr.lower() or "inverse" in clean_expr.lower():
                        inv_mat = M.inv()
                        return {"success": True, "type": "matrix_inv", "result": inv_mat.tolist(), "message": f"Matrix Inverse: {inv_mat.tolist()}"}
                    elif "eigen" in clean_expr.lower():
                        eigen_vals = M.eigenvals()
                        return {"success": True, "type": "matrix_eigen", "result": str(eigen_vals), "message": f"Matrix Eigenvalues: {eigen_vals}"}
                    elif "rank" in clean_expr.lower():
                        rank_val = M.rank()
                        return {"success": True, "type": "matrix_rank", "result": int(rank_val), "message": f"Matrix Rank: {rank_val}"}
                    else:
                        return {"success": True, "type": "matrix_info", "result": f"Shape: {M.shape}, Det: {M.det()}", "message": f"Matrix {M.shape} loaded. Determinant = {M.det()}"}
            except Exception as e:
                return {"success": False, "error": f"Matrix math error: {str(e)}"}

    # 5. Engineering & Control Systems (Root Locus, Bode Plot, Step Response)
    if "locus" in expr_str.lower() or "plot" in expr_str.lower() or "bode" in expr_str.lower():
        if HAS_MATPLOTLIB:
            desktop_dir = os.path.expanduser("~/Desktop")
            plots_dir = os.path.join(desktop_dir, "jarvis_plots")
            os.makedirs(plots_dir, exist_ok=True)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            plot_filename = os.path.join(plots_dir, f"plot_{timestamp}.png")
            
            try:
                if "locus" in expr_str.lower():
                    if HAS_NUMPY and HAS_SCIPY:
                        num_c, den_c, tf_str = parse_transfer_function(expr_str)
                        open_poles = np.roots(den_c)
                        open_zeros = np.roots(num_c) if len(num_c) > 1 else np.array([])
                        
                        gains = np.logspace(-3, 3, 500)
                        roots_list = []
                        pad_len = len(den_c) - len(num_c)
                        padded_num = np.pad(num_c, (pad_len, 0)) if pad_len > 0 else num_c
                        
                        for k in gains:
                            char_poly = np.polyadd(den_c, k * padded_num)
                            r = np.roots(char_poly)
                            roots_list.append(r)
                            
                        roots_arr = np.array(roots_list)
                        
                        plt.figure(figsize=(9, 6))
                        for col in range(roots_arr.shape[1]):
                            plt.plot(roots_arr[:, col].real, roots_arr[:, col].imag, color='purple', linewidth=1.5)
                            
                        plt.plot(open_poles.real, open_poles.imag, 'rx', markersize=10, markeredgewidth=2.5, label='Open-Loop Poles (X)')
                        if len(open_zeros) > 0:
                            plt.plot(open_zeros.real, open_zeros.imag, 'bo', markersize=8, fillstyle='none', markeredgewidth=2, label='Open-Loop Zeros (O)')
                            
                        plt.axhline(0, color='gray', linestyle='--', linewidth=1)
                        plt.axvline(0, color='red', linestyle='--', linewidth=1.2, label='Stability Boundary Re(s)=0')
                        plt.title(f"Root Locus Plot for G(s)H(s) = {tf_str}", fontsize=12)
                        plt.xlabel("Real Axis - Sigma (sec⁻¹)")
                        plt.ylabel("Imaginary Axis - jOmega (rad/sec)")
                        plt.grid(True, which='both')
                        plt.legend()
                        plt.tight_layout()
                        plt.savefig(plot_filename)
                        plt.close()
                        
                        poles_str = ", ".join([f"{p.real:.3f} + {p.imag:.3f}j" if abs(p.imag) > 1e-5 else f"{p.real:.3f}" for p in open_poles])
                        zeros_str = ", ".join([f"{z.real:.3f} + {z.imag:.3f}j" if abs(z.imag) > 1e-5 else f"{z.real:.3f}" for z in open_zeros]) if len(open_zeros) > 0 else "None"
                        num_asymptotes = len(open_poles) - len(open_zeros)
                        centroid = (np.sum(open_poles) - np.sum(open_zeros)) / num_asymptotes if num_asymptotes > 0 else 0
                        
                        os.system(f'start "" "{plot_filename}"')
                        return {
                            "success": True,
                            "type": "root_locus",
                            "plotPath": plot_filename,
                            "poles": poles_str,
                            "zeros": zeros_str,
                            "asymptotes": num_asymptotes,
                            "centroid": f"{centroid.real:.3f}",
                            "message": f"Generated Root Locus for G(s)H(s) = {tf_str}. Open-Loop Poles: [{poles_str}], Open-Loop Zeros: [{zeros_str}], Asymptotes: {num_asymptotes}, Centroid: {centroid.real:.3f}. Saved image to Desktop/jarvis_plots. Opened in image viewer."
                        }
                    else:
                        return {"success": False, "error": "NumPy and SciPy required for Root Locus."}
                        
                elif "bode" in expr_str.lower():
                    if HAS_SCIPY:
                        num_c, den_c, tf_str = parse_transfer_function(expr_str)
                        sys_tf = signal.TransferFunction(num_c, den_c)
                        w, mag, phase = signal.bode(sys_tf)
                        
                        plt.figure(figsize=(8, 6))
                        plt.subplot(2, 1, 1)
                        plt.semilogx(w, mag, color='magenta', linewidth=2)
                        plt.title(f"Bode Plot for H(s) = {tf_str}")
                        plt.ylabel("Magnitude (dB)")
                        plt.grid(True, which="both")
                        
                        plt.subplot(2, 1, 2)
                        plt.semilogx(w, phase, color='cyan', linewidth=2)
                        plt.xlabel("Frequency (rad/s)")
                        plt.ylabel("Phase (deg)")
                        plt.grid(True, which="both")
                        plt.tight_layout()
                        plt.savefig(plot_filename)
                        plt.close()
                        
                        os.system(f'start "" "{plot_filename}"')
                        return {
                            "success": True,
                            "type": "bode_plot",
                            "plotPath": plot_filename,
                            "message": f"Generated Bode Plot for H(s) = {tf_str} and saved image to Desktop/jarvis_plots. Opened in image viewer."
                        }
                    else:
                        return {"success": False, "error": "SciPy required for Bode plots."}
                elif "step" in expr_str.lower() or "control" in expr_str.lower():
                    if HAS_SCIPY:
                        num_c, den_c, tf_str = parse_transfer_function(expr_str)
                        sys_tf = signal.TransferFunction(num_c, den_c)
                        t, y = signal.step(sys_tf)
                        plt.figure(figsize=(8, 5))
                        plt.plot(t, y, label=f"Step Response H(s) = {tf_str}", color='cyan', linewidth=2)
                        plt.title(f"Step Response for H(s) = {tf_str}")
                        plt.xlabel("Time (t)")
                        plt.ylabel("Output y(t)")
                        plt.grid(True)
                        plt.legend()
                        plt.tight_layout()
                        plt.savefig(plot_filename)
                        plt.close()
                        
                        os.system(f'start "" "{plot_filename}"')
                        return {
                            "success": True,
                            "type": "step_response",
                            "plotPath": plot_filename,
                            "message": f"Generated Step Response for H(s) = {tf_str} and saved image to Desktop/jarvis_plots. Opened in image viewer."
                        }
                    else:
                        return {"success": False, "error": "SciPy required for control system step response."}
                else:
                    if HAS_NUMPY and HAS_SYMPY:
                        target_func = re.sub(r'^(plot)\s+', '', clean_expr, flags=re.IGNORECASE).strip()
                        x_arr = np.linspace(-10, 10, 500)
                        x_sym = sp.Symbol('x')
                        parsed = sp.sympify(target_func)
                        f = sp.lambdify(x_sym, parsed, "numpy")
                        y_arr = f(x_arr)
                        plt.figure(figsize=(8, 5))
                        plt.plot(x_arr, y_arr, label=f"f(x) = {target_func}", color='blue', linewidth=2)
                        plt.title(f"Plot of f(x) = {target_func}")
                        plt.xlabel("x")
                        plt.ylabel("y")
                        plt.grid(True)
                        plt.legend()
                        plt.tight_layout()
                        plt.savefig(plot_filename)
                        plt.close()
                        
                        os.system(f'start "" "{plot_filename}"')
                        return {
                            "success": True,
                            "type": "plot",
                            "plotPath": plot_filename,
                            "message": f"Generated Plot of f(x) = {target_func} and saved image to Desktop/jarvis_plots. Opened in image viewer."
                        }
                    else:
                        return {"success": False, "error": "NumPy and SymPy required for function plotting."}
            except Exception as e:
                return {"success": False, "error": f"Plotting error: {str(e)}"}
        return {"success": False, "error": "Matplotlib is required for plotting."}

    # 6. Fallback Numeric / SymPy Simple Calculator Evaluation (Instant Non-AI Python Math)
    try:
        if HAS_SYMPY:
            parsed = sp.sympify(clean_expr)
            res = parsed.evalf() if hasattr(parsed, 'evalf') else parsed
            try:
                val = float(res)
                res_val = int(val) if val.is_integer() else val
            except:
                res_val = str(res)
            return {
                "success": True,
                "type": "evaluation",
                "expression": clean_expr,
                "result": res_val,
                "message": f"{clean_expr} = {res_val}"
            }
        else:
            res = eval(clean_expr)
            return {
                "success": True,
                "type": "evaluation",
                "expression": clean_expr,
                "result": res,
                "message": f"{clean_expr} = {res}"
            }
    except Exception as e:
        return {"success": False, "error": f"Math evaluation error: {str(e)}"}

if __name__ == "__main__":
    raw_expr = sys.argv[1] if len(sys.argv) > 1 else ""
    res = handle_math(raw_expr)
    print(json.dumps(res))
