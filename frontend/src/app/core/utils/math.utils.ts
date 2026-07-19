/**
 * Convierte una medida en milímetros a pulgadas en formato fraccional,
 * redondeando siempre al dieciseisavo (1/16) más cercano.
 * 
 * @param mm La medida en milímetros.
 * @returns Un string con la medida en pulgadas (ej. '1 1/2"', '5/16"').
 */
export function mmToFractionalInches(mm: number | undefined | null): string {
    if (mm === undefined || mm === null || isNaN(mm)) return '';
    
    // 1 pulgada = 25.4 mm
    const inchesDecimal = mm / 25.4;
    
    // Separar pulgadas enteras
    let wholeInches = Math.floor(inchesDecimal);
    
    // Calcular el numerador para 1/16, redondeando al más cercano
    const fractionalPart = inchesDecimal - wholeInches;
    let numerator = Math.round(fractionalPart * 16);
    let denominator = 16;

    // Si el numerador redondeado alcanza 16 (ej. 15.9/16 se redondea a 16/16), 
    // pasamos a la siguiente pulgada entera.
    if (numerator === 16) {
        wholeInches += 1;
        numerator = 0;
    }

    // Si la fracción es 0 (ej. cayó exacto en la pulgada), retornamos solo el entero
    if (numerator === 0) {
        return `${wholeInches}"`;
    }

    // Función auxiliar para calcular el Máximo Común Divisor (MCD)
    const getGCD = (a: number, b: number): number => {
        return b === 0 ? a : getGCD(b, a % b);
    };

    // Simplificar la fracción (ej. 10/16 se convierte en 5/8)
    const gcd = getGCD(numerator, denominator);
    numerator /= gcd;
    denominator /= gcd;

    // Si no hay pulgadas enteras, retornamos solo la fracción (ej. "3/16"")
    if (wholeInches === 0) {
        return `${numerator}/${denominator}"`;
    }
    
    // Retornamos el entero y la fracción (ej. "2 1/4"")
    return `${wholeInches} ${numerator}/${denominator}"`;
}
