// A way of wirting async handler using Promises
const asyncHandler = (requestHandlerFunction) => {
  return (req, res, next) => {
    Promise.resolve(requestHandlerFunction(req, res, next)).catch((error) =>
      next(error)
    );
  };
};

export { asyncHandler };

// A breadkdown for HOF wirting async handler
/*
    const asyncHandler = (fn) => {} The general structure of HOF
    const asyncHandler = (fn) => {() => {}} The function returns another function
    const asyncHandler = (fn) => async () => {} The returned function same is above with
                                                async keyword and imporoved syntax
*/

// A way of wirting async handler using try catch block
/* 
    const asyncHandler = (fn) => async (req, res, next) => {
        try {
            await fn(req, res, next)
        } catch (error) {
            res.status(err.code || 500).json({
                success: false,
                message: err.message || "Internal Server Error"
            })
        }    
    }
*/
