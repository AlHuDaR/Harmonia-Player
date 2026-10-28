package com.alhudar.harmonia.youtube;
import org.junit.Test;
import static org.junit.Assert.*;
import java.io.IOException;
public class TransferPolicyTest {
  @Test public void retriesOnlyTransientFailuresWithFiniteBudget() {
    assertTrue(TransferPolicy.retryable(new IOException("network"),0));
    assertTrue(TransferPolicy.retryable(new SafeHttp.HttpFailure(429),2));
    assertTrue(TransferPolicy.retryable(new SafeHttp.HttpFailure(503),3));
    assertFalse(TransferPolicy.retryable(new SafeHttp.HttpFailure(403),0));
    assertFalse(TransferPolicy.retryable(new SafeHttp.HttpFailure(404),0));
    assertFalse(TransferPolicy.retryable(new IOException(),4));
    assertFalse(TransferPolicy.retryable(new javax.net.ssl.SSLHandshakeException("certificate"),0));
    assertFalse(TransferPolicy.retryable(new TransferPolicy.PermanentFailure("storage"),0));
  }
  @Test public void androidStopDoesNotReviveTerminalJobs() {
    assertTrue(TransferPolicy.canTransition("downloading","retrying"));
    assertTrue(TransferPolicy.canTransition("retrying","complete"));
    assertFalse(TransferPolicy.canTransition("complete","retrying"));
    assertFalse(TransferPolicy.canTransition("failed","downloading"));
    assertFalse(TransferPolicy.canTransition("cancelled","complete"));
    assertTrue(TransferPolicy.canTransition("complete","failed"));
  }
  @Test public void boundsKnownAndUnknownLengthTransfers() throws Exception {
    TransferPolicy.verifyBudget(-1,0);TransferPolicy.verifyBudget(TransferPolicy.MAX_BYTES,1000);
    try{TransferPolicy.verifyBudget(TransferPolicy.MAX_BYTES+1,0);fail();}catch(TransferPolicy.PermanentFailure expected){}
    try{TransferPolicy.verifyBudget(10,TransferPolicy.MAX_DURATION_MS+1);fail();}catch(TransferPolicy.PermanentFailure expected){}
  }
  @Test public void neverAcceptsEmptyOrTruncatedTransfers() throws Exception {
    TransferPolicy.verifyLength(100,100);TransferPolicy.verifyLength(-1,42);
    for(long actual:new long[]{0,99,101}) {
      try{TransferPolicy.verifyLength(100,actual);fail();}catch(IOException expected){}
    }
  }
}
