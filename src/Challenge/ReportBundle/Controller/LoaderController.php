<?php

namespace Challenge\ReportBundle\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Sensio\Bundle\FrameworkExtraBundle\Configuration\Route;
use Sensio\Bundle\FrameworkExtraBundle\Configuration\Template;

class LoaderController extends Controller {

    private function saveAndDetach($em, $entity) {

        $em->persist($entity);
        $em->flush();

        $em->detach($entity);
    }

    private function generateProducts($size, $em) {
        for ($index = 0; $index < $size; $index++) {

            $product = new Product();
            $product->setProduct("product-$index");
            $product->setUnitPrice(200 + $index);
            $product->setUnitCost(100 + $index);

            $this->saveAndDetach($em, $product);
        }
    }

    private function getEntity($name, $em) {

        $max = 50;
        $dql = "SELECT e FROM $name e";
        $query = $em->createQuery($dql)->setMaxResults($max);

        $i = rand(0, ($max - 1));

        $results = $query->execute();

        return $results[$i];
    }

    private function generateOrders($size, $em) {
        for ($index = 0; $index < $size; $index++) {

            $order = new SalesOrder();
            $n = rand(1, 5);

            $orderLines = $this->getOrderLines($n, $em);

            $order->setCountry($this->getEntity("ChallengeReportBundle:Country", $em));
            $order->setUsername("username-$index");
            $order->setTotalPrice($orderLines['totalPrice']);

            $em->persist($order);
            $em->flush();

            foreach ($orderLines['lines'] as $orderLine) {
                $orderLine->setSalesOrder($order);
                $this->saveAndDetach($em, $orderLine);
            }

            $em->detach($order);
        }
    }

    private function getOrderLines($size, $em) {

        $totalPriceOrder = 0.0;
        $lines = array();

        for ($index = 0; $index < $size; $index++) {

            $quantity = 1 + $index;
            $product = $this->getEntity('ChallengeReportBundle:Product', $em);
            $totalPrice = $product->getUnitPrice() * $quantity;
            $totalCost = $product->getUnitCost() * $quantity;
            $totalProfit = $totalPrice - $totalCost;
            $totalPriceOrder += $totalPrice;

            $orderLine = new SalesOrderLine();
            $orderLine->setProduct($product);
            $orderLine->setQuantity($quantity);
            $orderLine->setTotalPrice($totalPrice);
            $orderLine->setTotalCost($totalCost);
            $orderLine->setTotalProfit($totalProfit);
            $orderLine->setUnitPrice($product->getUnitPrice());
            $orderLine->setUnitCost($product->getUnitCost());

            $lines[] = $orderLine;
        }

        return array('totalPrice' => $totalPriceOrder, 'lines' => $lines);
    }

    /**
     * @Route("/load")
     * @Template()
     */
    public function loadAction() {
        ini_set('max_execution_time', 300);
        $em = $this->getDoctrine()->getManager();
        $this->generateProducts(2000, $em);
        $this->generateOrders(5000, $em);

        $response = new Response();
        $response->setContent('ok!');
        $response->headers->set('Content-Type', 'text/plain');

        return $response;
    }

}
