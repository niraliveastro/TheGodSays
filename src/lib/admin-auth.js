/**
 * Admin Authentication Helper
 * Verifies admin passcode for protected API routes
 */

const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || 'Spacenos.nxt@global'

/**
 * Verify admin authentication from request
 * Checks for passcode in Authorization header or request body
 * @param {Request} request - The incoming request
 * @param {Object} body - Optional pre-parsed request body (to avoid reading twice)
 * @returns {Promise<{isAdmin: boolean, error?: string}>}
 */
export async function verifyAdminAuth(request, body = null) {
  try {
    // Check Authorization header first
    const authHeader = request.headers.get('authorization')
    if (authHeader) {
      // Support both "Bearer <passcode>" and direct passcode
      const passcode = authHeader.startsWith('Bearer ')
        ? authHeader.substring(7)
        : authHeader
      
      if (passcode === ADMIN_PASSCODE) {
        return { isAdmin: true }
      }
    }

    // Check X-Admin-Passcode header (alternative method)
    const headerPasscode = request.headers.get('x-admin-passcode')
    if (headerPasscode === ADMIN_PASSCODE) {
      return { isAdmin: true }
    }

    // Check request body for passcode (for POST/PUT requests)
    // Use provided body if available, otherwise try to read it
    let requestBody = body
    if (!requestBody) {
      try {
        // Clone request to avoid "body already read" error
        const clonedRequest = request.clone()
        requestBody = await clonedRequest.json()
      } catch (e) {
        // Request body might not be JSON or might be empty
        // This is okay, we'll just check headers
      }
    }

    if (requestBody && requestBody.adminPasscode === ADMIN_PASSCODE) {
      return { isAdmin: true }
    }
    
    // Return error if passcode was provided but incorrect
    if (requestBody && requestBody.adminPasscode) {
      return { 
        isAdmin: false, 
        error: 'Invalid admin passcode' 
      }
    }

    // No valid passcode found
    return { 
      isAdmin: false, 
      error: 'Admin authentication required' 
    }
  } catch (error) {
    console.error('Error verifying admin auth:', error)
    return { 
      isAdmin: false, 
      error: 'Authentication verification failed' 
    }
  }
}

/**
 * Middleware function to protect API routes
 * Returns error response if not authenticated
 * @param {Request} request - The incoming request
 * @param {Object} body - Optional pre-parsed request body
 * @returns {Promise<Response|null>} - Returns error response if not admin, null if admin
 */
export async function requireAdminAuth(request, body = null) {
  const { isAdmin, error } = await verifyAdminAuth(request, body)
  
  if (!isAdmin) {
    return Response.json(
      { 
        error: error || 'Admin authentication required',
        message: 'This operation requires admin privileges. Please provide a valid admin passcode.' 
      },
      { status: 401 }
    )
  }
  
  return null
}

