<?php

namespace Challenge\ReportBundle\Service;

use Doctrine\ORM\EntityManager;

use Challenge\ReportBundle\Entity\Product;
use Challenge\ReportBundle\Entity\SalesOrder;
use Challenge\ReportBundle\Entity\SalesOrderLine;

/**
 * Description of LoaderService
 *
 * @author Flavio
 */
class TesterService {
    
    protected $em;

    public function __construct(EntityManager $em)
    {
        $this->em = $em;
    }
    
    // Public API
    public function generateProducts($size) {

        ini_set('max_execution_time', 300);
        
        $batchSize = 200;

        for ($index = 0; $index < $size; $index++) {

            $product = new Product();
            $product->setProduct("product-$index");
            $product->setUnitPrice(200 + $index);
            $product->setUnitCost(110 + $index);

            $this->em->persist($product);
            if (($index % $batchSize) == 0) {
                $this->em->flush();
                $this->em->clear(); // Detaches all objects from Doctrine!
            }
        }
        

        // 10% of products are sold under its cost
        for ($index = 0; $index < ($size/10); $index++) {

            $product = new Product();
            $product->setProduct("product-under-cost-$index");
            $product->setUnitPrice(100 + $index);
            $product->setUnitCost(110 + $index);

            $this->em->persist($product);
            if (($index % $batchSize) == 0) {
                $this->em->flush();
                $this->em->clear(); // Detaches all objects from Doctrine!
            }
        }

        $this->em->flush();
        $this->em->clear(); // Detaches all objects from Doctrine!
    }

    public function generateOrders($size) {

        ini_set('max_execution_time', 300);
        $batchSize = 20;

        for ($index = 0; $index < $size; $index++) {

            $date = new \DateTime();
            $i = rand(0, 30);
            $date->modify("-$i day");

            $order = new SalesOrder();
            $n = rand(1, 5);

            $orderLines = $this->getOrderLines($n, $date);

            $order->setCountry($this->getEntity("ChallengeReportBundle:Country"));
            $order->setUsername("username-$index");
            $order->setTotalPrice($orderLines['totalPrice']);
            $order->setCreationDate($date);

            $this->em->persist($order);

            foreach ($orderLines['lines'] as $orderLine) {
                $orderLine->setSalesOrder($order);
                $this->em->persist($orderLine);
            }

            if (($index % $batchSize) == 0) {
                $this->em->flush();
                $this->em->clear(); // Detaches all objects from Doctrine!
            }
        }

        $this->em->flush();
        $this->em->clear(); // Detaches all objects from Doctrine!
    }


    // Private methods    
    private function getEntity($name) {

        $countDql = "SELECT COUNT(e) FROM $name e";
        $max = $this->em->createQuery($countDql)->getSingleScalarResult();

        $i = rand(0, ($max - 1));

        // Should use an order by
        $dql = "SELECT e FROM $name e";
        $query = $this->em->createQuery($dql)
                ->setFirstResult($i)
                ->setMaxResults(1);
        $results = $query->execute();

        return $results[0];
    }
    
    private function getOrderLines($size, $date) {

        $totalPriceOrder = 0.0;
        $lines = array();

        for ($index = 0; $index < $size; $index++) {

            $quantity = 1 + $index;
            $product = $this->getEntity('ChallengeReportBundle:Product');
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
            $orderLine->setCreationDate($date);

            $lines[] = $orderLine;
        }

        return array('totalPrice' => $totalPriceOrder, 'lines' => $lines);
    }    
}

?>
